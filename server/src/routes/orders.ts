import { Router } from 'express';
import { prisma } from '../prismaClient';
import { authenticate, authorize } from '../middleware/auth';
import { isValidUUID } from '../utils/validation';

const router = Router();

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

// State machine for allowed transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PICKUP', 'CANCELLED'],
  PROCESSING: ['PICKUP', 'CANCELLED'],
  PICKUP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

// GET /api/orders
// Admins see all. Buyers/Farmers see their own.
router.get('/', authenticate, async (req, res) => {
  try {
    let whereClause = {};
    if (req.user!.role !== 'ADMIN') {
      whereClause = {
        OR: [
          { buyerId: req.user!.id },
          { supplierId: req.user!.id }
        ]
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        buyer: { select: { name: true, location: true } },
        supplier: { select: { name: true, location: true } },
        produce: { select: { crop: true } },
      }
    });

    res.json({ success: true, data: { orders } });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/mine
// Returns orders where the user is either buyer or supplier
router.get('/mine', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: req.user!.id },
          { supplierId: req.user!.id }
        ]
      },
      include: {
        buyer: { select: { name: true, location: true } },
        supplier: { select: { name: true, location: true } },
        produce: { select: { crop: true } },
      }
    });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id as string;
    if (!isValidUUID(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true, email: true, location: true } },
        supplier: { select: { id: true, name: true, email: true, location: true } },
        produce: true,
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Access control
    if (order.buyerId !== req.user!.id && order.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot view this order' });
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error('Get order by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/orders
// Create an order and deduct inventory atomically
router.post('/', authenticate, authorize(['BUYER']), async (req, res) => {
  try {
    const { produceId, requirementId, quantity } = req.body;

    if (!produceId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid input. Positive quantity and produceId required.' });
    }

    // Transaction to prevent overselling
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch produce and lock it (if SQLite supported row locks, but SQLite transactions are serializable)
      const produce = await tx.produce.findUnique({ where: { id: produceId } });

      if (!produce) {
        throw new Error('PRODUCE_NOT_FOUND');
      }

      if (produce.status !== 'AVAILABLE') {
        throw new Error('PRODUCE_UNAVAILABLE');
      }

      if (produce.quantity < quantity) {
        throw new Error('INSUFFICIENT_INVENTORY');
      }

      // If a requirementId is provided, optionally verify it exists and belongs to the buyer
      if (requirementId) {
        const reqCheck = await tx.requirement.findUnique({ where: { id: requirementId } });
        if (!reqCheck || reqCheck.buyerId !== req.user!.id || reqCheck.status !== 'OPEN') {
          throw new Error('INVALID_REQUIREMENT');
        }
      }

      // 2. Deduct inventory
      const newQuantity = produce.quantity - quantity;
      const newProduceStatus = newQuantity === 0 ? 'SOLD' : 'AVAILABLE';

      await tx.produce.update({
        where: { id: produceId },
        data: {
          quantity: newQuantity,
          status: newProduceStatus
        }
      });

      // 3. Create the order
      const order = await tx.order.create({
        data: {
          produceId,
          requirementId: requirementId || null,
          buyerId: req.user!.id,
          supplierId: produce.supplierId,
          agreedQuantity: quantity,
          agreedPrice: produce.expectedPrice, // Deriving price from the produce listing
          status: 'PENDING',
          events: {
            create: [
              {
                status: 'PENDING',
                description: 'Order placed by buyer',
                location: 'System'
              }
            ]
          }
        },
        include: {
          produce: true,
          events: true
        }
      });

      return order;
    });

    res.status(201).json({ success: true, message: 'Order created successfully', data: { order: result } });
  } catch (error: any) {
    if (error.message === 'PRODUCE_NOT_FOUND') return res.status(404).json({ success: false, message: 'Produce not found' });
    if (error.message === 'PRODUCE_UNAVAILABLE') return res.status(409).json({ success: false, message: 'Produce is no longer available' });
    if (error.message === 'INSUFFICIENT_INVENTORY') return res.status(409).json({ success: false, message: 'Insufficient inventory available' });
    if (error.message === 'INVALID_REQUIREMENT') return res.status(400).json({ success: false, message: 'Invalid or unauthorized requirement' });

    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status
// Update order status based on strict state machine
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, description, location } = req.body;
    const orderId = req.params.id as string;
    if (!isValidUUID(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Perform update and create event
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch latest order state inside transaction to prevent race conditions
      const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (!currentOrder) throw new Error('ORDER_NOT_FOUND');

      // Access control
      if (currentOrder.buyerId !== req.user!.id && currentOrder.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
      }

      // Role-specific transition restrictions
      if (req.user!.role !== 'ADMIN') {
        if (req.user!.id === currentOrder.buyerId) {
          // Buyer cannot dispatch/transit orders
          if (['PROCESSING', 'PICKUP', 'IN_TRANSIT'].includes(status)) {
            throw new Error('FORBIDDEN');
          }
          // Buyer cannot cancel after goods are in pickup/transit
          if (status === 'CANCELLED' && ['PICKUP', 'IN_TRANSIT'].includes(currentOrder.status)) {
            throw new Error('FORBIDDEN');
          }
        }
      }

      // 2. State machine check inside transaction
      const allowedNextStatuses = ALLOWED_TRANSITIONS[currentOrder.status] || [];
      if (!allowedNextStatuses.includes(status) && req.user!.role !== 'ADMIN') {
        throw new Error('INVALID_TRANSITION');
      }

      // If an admin forces the same state, do not restock again to prevent double-restocking
      if (currentOrder.status === status) {
        throw new Error('NO_CHANGE');
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status,
          description: description || `Status updated to ${status}`,
          location: location || null
        }
      });

      // If cancelled, restock the inventory and refund/cancel any escrow ledger or pending payments
      if (status === 'CANCELLED') {
        const produce = await tx.produce.findUnique({ where: { id: currentOrder.produceId } });
        if (produce) {
          await tx.produce.update({
            where: { id: produce.id },
            data: {
              quantity: produce.quantity + currentOrder.agreedQuantity,
              status: 'AVAILABLE'
            }
          });
        }

        // Cancel pending payments
        await tx.payment.updateMany({
          where: { orderId, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        });

        // If escrow was locked, record ESCROW_CANCELLED debit entry to maintain balanced ledger
        const lockedEscrow = await tx.escrowLedger.findFirst({
          where: { orderId, entryType: 'ESCROW_LOCKED' }
        });
        if (lockedEscrow) {
          const hasRelease = await tx.escrowLedger.findFirst({
            where: { orderId, entryType: 'ESCROW_RELEASED' }
          });
          const hasCancel = await tx.escrowLedger.findFirst({
            where: { orderId, entryType: 'ESCROW_CANCELLED' }
          });

          if (!hasRelease && !hasCancel) {
            await tx.escrowLedger.create({
              data: {
                orderId,
                paymentId: lockedEscrow.paymentId,
                buyerId: lockedEscrow.buyerId,
                supplierId: lockedEscrow.supplierId,
                entryType: 'ESCROW_CANCELLED',
                amount: lockedEscrow.amount,
                currency: lockedEscrow.currency,
                direction: 'DEBIT',
                idempotencyKey: `cancel-escrow-${orderId}-${Date.now()}`,
                description: 'Simulated Escrow Refund - Order cancelled'
              }
            });

            await tx.payment.updateMany({
              where: { id: lockedEscrow.paymentId, status: 'CAPTURED' },
              data: { status: 'CANCELLED' }
            });
          }
        }
      }

      return updated;
    });

    res.json({ success: true, message: 'Order status updated', data: { order: updatedOrder } });
  } catch (error: any) {
    if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ success: false, message: 'Order not found' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ success: false, message: 'Forbidden' });
    if (error.message === 'INVALID_TRANSITION') return res.status(400).json({ success: false, message: 'Invalid status transition' });
    if (error.message === 'NO_CHANGE') return res.status(400).json({ success: false, message: 'Status is already set to requested value' });

    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/:id/events
// Fetch traceability timeline
router.get('/:id/events', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id as string;
    if (!isValidUUID(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId !== req.user!.id && order.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const events = await prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: { events } });
  } catch (error) {
    console.error('Get order events error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/:id/payment
// Fetch payment details for an order
router.get('/:id/payment', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id as string;
    if (!isValidUUID(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId !== req.user!.id && order.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!order.payments || order.payments.length === 0) {
       return res.status(404).json({ success: false, message: 'No payment found for this order' });
    }

    res.json({ success: true, data: { payment: order.payments[0] } });
  } catch (error) {
    console.error('Get order payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/:id/escrow
// Fetch escrow ledger entries for an order
router.get('/:id/escrow', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id as string;
    if (!isValidUUID(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { escrowEntries: { orderBy: { createdAt: 'desc' } } } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId !== req.user!.id && order.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: { escrowEntries: order.escrowEntries } });
  } catch (error) {
    console.error('Get order escrow error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
