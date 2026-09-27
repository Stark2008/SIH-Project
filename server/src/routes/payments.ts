import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { PaymentService } from '../services/paymentService';
import { prisma } from '../prismaClient';
import { isValidUUID } from '../utils/validation';

const router = Router();
const paymentService = new PaymentService();

// POST /api/payments
// Creates a new payment for a given order
router.post('/', authenticate, authorize(['BUYER']), async (req, res) => {
  try {
    const { orderId, idempotencyKey } = req.body;

    if (!orderId || !idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(400).json({ success: false, message: 'orderId and idempotencyKey are required' });
    }
    
    if (idempotencyKey.trim() === '' || idempotencyKey.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid idempotencyKey length' });
    }

    const payment = await paymentService.createPayment(orderId, req.user!.id, idempotencyKey);
    
    res.status(201).json({ success: true, data: { payment } });
  } catch (error: any) {
    if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ success: false, message: 'Order not found' });
    if (error.message === 'UNAUTHORIZED_BUYER') return res.status(403).json({ success: false, message: 'Not authorized to pay for this order' });
    if (error.message === 'ORDER_CANCELLED') return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled order' });
    if (error.message === 'IDEMPOTENCY_MISMATCH') return res.status(409).json({ success: false, message: 'Idempotency key mismatch with different payload' });

    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/payments
// List payments. Admin sees all; users see payments where they are buyer or order supplier.
router.get('/', authenticate, async (req, res) => {
  try {
    let whereClause = {};
    if (req.user!.role !== 'ADMIN') {
      whereClause = {
        OR: [
          { buyerId: req.user!.id },
          { order: { supplierId: req.user!.id } }
        ]
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            produce: { select: { crop: true } },
            supplier: { select: { id: true, name: true } }
          }
        },
        buyer: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { payments } });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/payments/:id
// Retrieves payment details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const paymentId = req.params.id as string;
    if (!isValidUUID(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Access control: Admin, the buyer, or the supplier
    if (payment.buyerId !== req.user!.id && payment.order.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: { payment } });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/payments/:id/simulate
// DEVELOPMENT ONLY: Simulates a webhook from the mock provider
router.post('/:id/simulate', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Simulation endpoint is disabled in production' });
    }

    const paymentId = req.params.id as string;
    if (!isValidUUID(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const { success } = req.body;
    
    if (typeof success !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Boolean success parameter is required' });
    }

    // In a real app, webhooks bypass user auth, and instead rely on Stripe/Provider signatures.
    // Since this is mock UI-driven dev tooling, we verify auth to prevent random attacks.
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    // Only the buyer or admin can trigger the mock simulation UI
    if (payment.buyerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updatedPayment = await paymentService.simulatePaymentResult(paymentId, success);

    res.json({ success: true, message: 'Simulation complete', data: { payment: updatedPayment } });
  } catch (error: any) {
    if (error.message === 'PAYMENT_NOT_FOUND') return res.status(404).json({ success: false, message: 'Payment not found' });
    if (error.message === 'PAYMENT_ALREADY_PROCESSED') return res.status(400).json({ success: false, message: 'Payment already completed or refunded' });

    console.error('Simulation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
