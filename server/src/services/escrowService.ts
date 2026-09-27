import { prisma } from '../prismaClient';

export class EscrowService {
  async lockFunds(paymentId: string, buyerId: string, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.trim() === '' || idempotencyKey.length > 100) {
      throw new Error('INVALID_IDEMPOTENCY_KEY');
    }

    // Since we use SQLite, we can't do SELECT FOR UPDATE easily. We rely on idempotencyKey uniqueness, 
    // and paymentId uniqueness to avoid duplicate locks for the same payment.
    // Wait, the prompt says "A captured payment can create one escrow-lock entry."
    // We should enforce this by checking existing entries.
    
    // Check payment validity first to avoid leaking state to unauthorized users
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.buyerId !== buyerId) {
      throw new Error('UNAUTHORIZED_BUYER');
    }

    // Check for global idempotency reuse
    const existingEntryByKey = await prisma.escrowLedger.findUnique({
      where: { idempotencyKey }
    });

    if (existingEntryByKey) {
      if (existingEntryByKey.paymentId !== paymentId || existingEntryByKey.entryType !== 'ESCROW_LOCKED') {
        throw new Error('IDEMPOTENCY_MISMATCH');
      }
      return existingEntryByKey;
    }

    // Check if the payment already has an ESCROW_LOCKED entry with a different key
    const existingLock = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_LOCKED' }
    });

    if (existingLock) {
      throw new Error('PAYMENT_ALREADY_LOCKED');
    }

    if (payment.status !== 'CAPTURED') {
      throw new Error('PAYMENT_NOT_CAPTURED');
    }

    if (payment.order.status === 'CANCELLED') {
      throw new Error('ORDER_CANCELLED');
    }

    // Create the EscrowLedger entry transactionally
    // We must ensure the payment is still CAPTURED and the order isn't CANCELLED
    return await prisma.$transaction(async (tx) => {
      // Double check inside transaction (Though SQLite transactions are serialized, this is good practice)
      const currentPayment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      if (!currentPayment || currentPayment.status !== 'CAPTURED') throw new Error('PAYMENT_NOT_CAPTURED');
      
      const existing = await tx.escrowLedger.findFirst({ where: { paymentId, entryType: 'ESCROW_LOCKED' } });
      if (existing) throw new Error('PAYMENT_ALREADY_LOCKED');

      return await tx.escrowLedger.create({
        data: {
          orderId: currentPayment.orderId,
          paymentId: currentPayment.id,
          buyerId: currentPayment.buyerId,
          supplierId: currentPayment.order.supplierId,
          entryType: 'ESCROW_LOCKED',
          amount: currentPayment.amount,
          currency: currentPayment.currency,
          direction: 'CREDIT',
          idempotencyKey,
          description: 'Simulated Escrow Lock - No real funds'
        }
      });
    });
  }

  async releaseFunds(paymentId: string, requestorId: string, requestorRole: string, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.trim() === '' || idempotencyKey.length > 100) {
      throw new Error('INVALID_IDEMPOTENCY_KEY');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) throw new Error('PAYMENT_NOT_FOUND');

    // Authorization: Only admin can trigger manually for this stage simulation
    if (requestorRole !== 'ADMIN') {
      throw new Error('UNAUTHORIZED_RELEASE');
    }

    // Must be ESCROW_LOCKED first
    const lockEntry = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_LOCKED' }
    });

    if (!lockEntry) {
      throw new Error('ESCROW_NOT_LOCKED');
    }

    // Check for global idempotency reuse
    const existingEntryByKey = await prisma.escrowLedger.findUnique({
      where: { idempotencyKey }
    });

    if (existingEntryByKey) {
      if (existingEntryByKey.paymentId !== paymentId || existingEntryByKey.entryType !== 'ESCROW_RELEASED') {
        throw new Error('IDEMPOTENCY_MISMATCH');
      }
      return existingEntryByKey;
    }

    // Check if already released
    const releaseEntry = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_RELEASED' }
    });

    if (releaseEntry) {
      throw new Error('ESCROW_ALREADY_RELEASED');
    }

    // Rejection rules
    if (payment.status !== 'CAPTURED') throw new Error('PAYMENT_NOT_CAPTURED');
    if (payment.order.status === 'CANCELLED') throw new Error('ORDER_CANCELLED');
    if (payment.order.status !== 'DELIVERED') throw new Error('ORDER_NOT_DELIVERED');

    return await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({ where: { id: payment.orderId } });
      if (!currentOrder || currentOrder.status !== 'DELIVERED') throw new Error('ORDER_NOT_DELIVERED');
      
      const existingRelease = await tx.escrowLedger.findFirst({ where: { paymentId, entryType: 'ESCROW_RELEASED' } });
      if (existingRelease) throw new Error('ESCROW_ALREADY_RELEASED');

      return await tx.escrowLedger.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          buyerId: payment.buyerId,
          supplierId: payment.order.supplierId,
          entryType: 'ESCROW_RELEASED',
          amount: lockEntry.amount, // Derived safely from lock
          currency: lockEntry.currency,
          direction: 'DEBIT',
          idempotencyKey,
          description: 'Simulated Escrow Release - No real funds transferred'
        }
      });
    });
  }

  async cancelEscrow(paymentId: string, requestorId: string, requestorRole: string, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.trim() === '' || idempotencyKey.length > 100) {
      throw new Error('INVALID_IDEMPOTENCY_KEY');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) throw new Error('PAYMENT_NOT_FOUND');

    if (payment.buyerId !== requestorId && payment.order.supplierId !== requestorId && requestorRole !== 'ADMIN') {
      throw new Error('UNAUTHORIZED');
    }

    const lockEntry = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_LOCKED' }
    });

    if (!lockEntry) {
      throw new Error('ESCROW_NOT_LOCKED');
    }

    const releaseEntry = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_RELEASED' }
    });
    if (releaseEntry) {
      throw new Error('ESCROW_ALREADY_RELEASED');
    }

    const existingCancel = await prisma.escrowLedger.findFirst({
      where: { paymentId, entryType: 'ESCROW_CANCELLED' }
    });
    if (existingCancel) {
      return existingCancel;
    }

    const existingByKey = await prisma.escrowLedger.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      if (existingByKey.paymentId !== paymentId || existingByKey.entryType !== 'ESCROW_CANCELLED') {
        throw new Error('IDEMPOTENCY_MISMATCH');
      }
      return existingByKey;
    }

    return await prisma.$transaction(async (tx) => {
      const cancelEntry = await tx.escrowLedger.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          buyerId: payment.buyerId,
          supplierId: payment.order.supplierId,
          entryType: 'ESCROW_CANCELLED',
          amount: lockEntry.amount,
          currency: lockEntry.currency,
          direction: 'DEBIT',
          idempotencyKey,
          description: 'Simulated Escrow Refund - Order cancelled'
        }
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED' }
      });

      return cancelEntry;
    });
  }
}
