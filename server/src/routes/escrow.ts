import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { EscrowService } from '../services/escrowService';
import { prisma } from '../prismaClient';
import { isValidUUID } from '../utils/validation';

const router = Router();
const escrowService = new EscrowService();

// POST /api/escrow/lock
router.post('/lock', authenticate, authorize(['BUYER']), async (req, res) => {
  try {
    const { paymentId, idempotencyKey } = req.body;
    
    if (!paymentId || !idempotencyKey) {
      return res.status(400).json({ success: false, message: 'paymentId and idempotencyKey are required' });
    }

    const escrowEntry = await escrowService.lockFunds(paymentId, req.user!.id, idempotencyKey);
    res.status(201).json({ success: true, data: { escrowEntry } });
  } catch (error: any) {
    if (error.message === 'INVALID_IDEMPOTENCY_KEY') return res.status(400).json({ success: false, message: 'Invalid idempotency key' });
    if (error.message === 'PAYMENT_NOT_FOUND') return res.status(404).json({ success: false, message: 'Payment not found' });
    if (error.message === 'UNAUTHORIZED_BUYER') return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    if (error.message === 'PAYMENT_NOT_CAPTURED') return res.status(400).json({ success: false, message: 'Payment must be in CAPTURED state' });
    if (error.message === 'PAYMENT_ALREADY_LOCKED') return res.status(400).json({ success: false, message: 'Payment is already locked in escrow' });
    if (error.message === 'ORDER_CANCELLED') return res.status(400).json({ success: false, message: 'Order is cancelled' });
    if (error.message === 'IDEMPOTENCY_MISMATCH') return res.status(409).json({ success: false, message: 'Idempotency key mismatch with different payload' });
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate idempotency key' });

    console.error('Escrow lock error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/escrow/release
// Releases escrow funds to the supplier. Strictly ADMIN only.
router.post('/release', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { paymentId, idempotencyKey } = req.body;

    if (!paymentId || !idempotencyKey) {
      return res.status(400).json({ success: false, message: 'paymentId and idempotencyKey are required' });
    }

    const escrowEntry = await escrowService.releaseFunds(paymentId, req.user!.id, req.user!.role, idempotencyKey);
    res.status(201).json({ success: true, message: 'Escrow funds released successfully', data: { escrowEntry } });
  } catch (error: any) {
    if (error.message === 'INVALID_IDEMPOTENCY_KEY') return res.status(400).json({ success: false, message: 'Invalid idempotency key' });
    if (error.message === 'PAYMENT_NOT_FOUND') return res.status(404).json({ success: false, message: 'Payment not found' });
    if (error.message === 'UNAUTHORIZED_RELEASE') return res.status(403).json({ success: false, message: 'Unauthorized to release escrow' });
    if (error.message === 'ESCROW_NOT_LOCKED') return res.status(400).json({ success: false, message: 'Escrow must be locked before release' });
    if (error.message === 'ESCROW_ALREADY_RELEASED') return res.status(400).json({ success: false, message: 'Escrow already released' });
    if (error.message === 'PAYMENT_NOT_CAPTURED') return res.status(400).json({ success: false, message: 'Payment is not captured' });
    if (error.message === 'ORDER_CANCELLED') return res.status(400).json({ success: false, message: 'Order is cancelled' });
    if (error.message === 'ORDER_NOT_DELIVERED') return res.status(400).json({ success: false, message: 'Order must be in DELIVERED status to release funds' });
    if (error.message === 'IDEMPOTENCY_MISMATCH') return res.status(409).json({ success: false, message: 'Idempotency key mismatch with different payload' });
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate idempotency key' });

    console.error('Escrow release error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/escrow
// List escrow ledger entries. Admin sees all; users see entries where they are buyer or supplier.
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

    const entries = await prisma.escrowLedger.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            produce: { select: { crop: true } }
          }
        },
        buyer: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { escrowEntries: entries } });
  } catch (error) {
    console.error('List escrow error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/escrow/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const entryId = req.params.id as string;
    if (!isValidUUID(entryId)) {
      return res.status(400).json({ success: false, message: 'Invalid escrow entry ID format' });
    }

    const entry = await prisma.escrowLedger.findUnique({
      where: { id: entryId },
      include: {
        order: true,
        buyer: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true, email: true } }
      }
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Escrow entry not found' });

    if (entry.buyerId !== req.user!.id && entry.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: { escrowEntry: entry } });
  } catch (error) {
    console.error('Get escrow error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
