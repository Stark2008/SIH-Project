import { prisma } from '../prismaClient';
import { MockPaymentProvider } from './mockPaymentProvider';

const provider = new MockPaymentProvider();

export class PaymentService {
  /**
   * Initializes a payment intent securely on the backend.
   */
  async createPayment(orderId: string, buyerId: string, idempotencyKey: string) {
    // 1. Validate order and check ownership
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== buyerId) {
      throw new Error('UNAUTHORIZED_BUYER');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('ORDER_CANCELLED');
    }

    // 2. Check if an active/successful payment already exists for this order
    const existingPaymentForOrder = await prisma.payment.findFirst({ 
      where: { orderId, status: { in: ['PENDING', 'AUTHORIZED', 'CAPTURED'] } },
      orderBy: { createdAt: 'desc' }
    });
    
    if (existingPaymentForOrder) {
      return existingPaymentForOrder;
    }

    // 3. Prevent duplicate payment requests using idempotency key
    const existingPaymentByKey = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existingPaymentByKey) {
      if (existingPaymentByKey.orderId !== orderId || existingPaymentByKey.buyerId !== buyerId) {
        throw new Error('IDEMPOTENCY_MISMATCH');
      }
      return existingPaymentByKey;
    }

    // 4. Calculate amount strictly from server-side order data. No client input trusted.
    // Assuming agreedPrice is per kg and agreedQuantity is in kg.
    // Convert to minor units (paise) -> * 100
    const amountInPaise = Math.round(order.agreedPrice * order.agreedQuantity * 100);

    // 5. Call Mock Provider
    const intent = await provider.createPaymentIntent(amountInPaise, 'INR', idempotencyKey);

    // 6. Record the transaction in the database
    const payment = await prisma.payment.create({
      data: {
        orderId,
        buyerId,
        amount: amountInPaise,
        currency: 'INR',
        status: intent.status,
        provider: 'MOCK_PROVIDER',
        providerTxId: intent.providerTxId,
        idempotencyKey,
      }
    });

    return payment;
  }

  /**
   * Simulates a webhook delivery or a client-driven success confirmation
   * In production, this would be a verified webhook from the payment provider.
   */
  async simulatePaymentResult(paymentId: string, success: boolean) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      
      if (!payment) throw new Error('PAYMENT_NOT_FOUND');
      
      // Do not re-process completed payments
      if (['CAPTURED', 'REFUNDED'].includes(payment.status)) {
         throw new Error('PAYMENT_ALREADY_PROCESSED');
      }

      const newStatus = success ? 'CAPTURED' : 'FAILED';
      const completedAt = success ? new Date() : null;
      const failureReason = success ? null : 'Simulated mock failure';

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          completedAt,
          failureReason
        }
      });

      // Record an auditable event on the order
      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          status: payment.order.status, // Order status might not necessarily change yet
          description: `Payment ${success ? 'captured successfully' : 'failed'}`,
          location: 'System'
        }
      });

      return updatedPayment;
    });
  }
}
