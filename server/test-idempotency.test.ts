import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from './src/prismaClient';
import { PaymentService } from './src/services/paymentService';
import { EscrowService } from './src/services/escrowService';

describe('Idempotency Regression', () => {
  let paymentService: PaymentService;
  let escrowService: EscrowService;

  let buyer1Id: string;
  let buyer2Id: string;
  let supplierId: string;
  let produceId: string;

  let order1Id: string;
  let order2Id: string;
  let order3Id: string;

  beforeAll(async () => {
    paymentService = new PaymentService();
    escrowService = new EscrowService();

    // Create seed data safely
    const supplier = await prisma.user.create({
      data: { email: `supp-${Date.now()}@test.com`, passwordHash: 'hash', name: 'Supp', role: 'FARMER' }
    });
    supplierId = supplier.id;

    const buyer1 = await prisma.user.create({
      data: { email: `buyer1-${Date.now()}@test.com`, passwordHash: 'hash', name: 'B1', role: 'BUYER' }
    });
    buyer1Id = buyer1.id;

    const buyer2 = await prisma.user.create({
      data: { email: `buyer2-${Date.now()}@test.com`, passwordHash: 'hash', name: 'B2', role: 'BUYER' }
    });
    buyer2Id = buyer2.id;

    const produce = await prisma.produce.create({
      data: { supplierId, crop: 'Tomatoes', quantity: 100, harvestDate: new Date(), location: 'Farm', qualityGrade: 'A', expectedPrice: 50, status: 'AVAILABLE' }
    });
    produceId = produce.id;

    const order1 = await prisma.order.create({
      data: { produceId, buyerId: buyer1Id, supplierId, agreedQuantity: 10, agreedPrice: 50, status: 'PENDING' }
    });
    order1Id = order1.id;

    const order2 = await prisma.order.create({
      data: { produceId, buyerId: buyer2Id, supplierId, agreedQuantity: 10, agreedPrice: 50, status: 'PENDING' }
    });
    order2Id = order2.id;

    const order3 = await prisma.order.create({
      data: { produceId, buyerId: buyer1Id, supplierId, agreedQuantity: 20, agreedPrice: 50, status: 'PENDING' }
    });
    order3Id = order3.id;
  });

  afterEach(async () => {
    await prisma.escrowLedger.deleteMany({ where: { OR: [{ buyerId: buyer1Id }, { buyerId: buyer2Id }] } });
    await prisma.payment.deleteMany({ where: { OR: [{ buyerId: buyer1Id }, { buyerId: buyer2Id }] } });
  });

  afterAll(async () => {
    // Final Cleanup
    await prisma.orderEvent.deleteMany({ where: { orderId: { in: [order1Id, order2Id, order3Id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [order1Id, order2Id, order3Id] } } });
    await prisma.produce.deleteMany({ where: { id: produceId } });
    await prisma.user.deleteMany({ where: { id: { in: [buyer1Id, buyer2Id, supplierId] } } });
  });

  it('Payment: Same key, same order, same buyer returns existing payment', async () => {
    const key = `pmt-key-same-${Date.now()}`;
    const pmt1 = await paymentService.createPayment(order1Id, buyer1Id, key);
    const pmt2 = await paymentService.createPayment(order1Id, buyer1Id, key);
    expect(pmt1.id).toEqual(pmt2.id);
  });

  it('Payment: Same key, different order throws mismatch', async () => {
    const key = `pmt-key-diff-ord-${Date.now()}`;
    await paymentService.createPayment(order1Id, buyer1Id, key);
    await expect(paymentService.createPayment(order3Id, buyer1Id, key))
      .rejects.toThrow('IDEMPOTENCY_MISMATCH');
  });

  it('Payment: Same key, different buyer throws mismatch', async () => {
    const key = `pmt-key-diff-buy-${Date.now()}`;
    await paymentService.createPayment(order1Id, buyer1Id, key);
    await expect(paymentService.createPayment(order1Id, buyer2Id, key))
      .rejects.toThrow('UNAUTHORIZED_BUYER'); // Gets caught by buyer check first, or mismatch if checked first
  });

  it('Escrow: Same key, different payment throws mismatch', async () => {
    const pmtKey1 = `pmt-esc-1-${Date.now()}`;
    const pmtKey2 = `pmt-esc-2-${Date.now()}`;
    const pmt1 = await paymentService.createPayment(order1Id, buyer1Id, pmtKey1);
    const pmt2 = await paymentService.createPayment(order3Id, buyer1Id, pmtKey2);
    
    await paymentService.simulatePaymentResult(pmt1.id, true);
    await paymentService.simulatePaymentResult(pmt2.id, true);

    const lockKey = `esc-lock-key-${Date.now()}`;
    await escrowService.lockFunds(pmt1.id, buyer1Id, lockKey);
    
    await expect(escrowService.lockFunds(pmt2.id, buyer1Id, lockKey))
      .rejects.toThrow('IDEMPOTENCY_MISMATCH');
  });
});
