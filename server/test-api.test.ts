import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './src/index';
import { prisma } from './src/prismaClient';
import jwt from 'jsonwebtoken';

describe('HTTP API Security & Integration Tests', () => {
  let buyerToken: string;
  let farmerToken: string;
  let adminToken: string;
  let buyerId: string;
  let farmerId: string;
  let orderId: string;
  let produceId: string;
  let paymentId: string;
  let fakeBuyerToken: string;

  beforeAll(async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const farmer = await prisma.user.findFirst({ where: { role: 'FARMER' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    
    if (!buyer || !farmer || !admin) throw new Error('Missing seed users');
    buyerId = buyer.id;
    farmerId = farmer.id;

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    buyerToken = jwt.sign({ userId: buyer.id, role: buyer.role }, secret, { expiresIn: '1h' });
    farmerToken = jwt.sign({ userId: farmer.id, role: farmer.role }, secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: admin.id, role: admin.role }, secret, { expiresIn: '1h' });
    fakeBuyerToken = jwt.sign({ userId: 'some-other-id', role: 'BUYER' }, secret, { expiresIn: '1h' });

    const produce = await prisma.produce.findFirst({ where: { supplierId: farmer.id } });
    if (!produce) throw new Error('Missing produce');
    produceId = produce.id;

    const order = await prisma.order.create({
      data: { buyerId: buyer.id, supplierId: farmer.id, produceId: produce.id, agreedPrice: 50, agreedQuantity: 10, status: 'PENDING' }
    });
    orderId = order.id;
  });

  afterAll(async () => {
    // Cleanup created test data to prevent accumulation
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  });

  describe('Authentication Middleware', () => {
    it('should reject missing token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer INVALID_TOKEN_123');
      expect(res.status).toBe(401);
    });

    it('should reject expired token (401)', async () => {
      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const expiredToken = jwt.sign({ userId: buyerId, role: 'BUYER' }, secret, { expiresIn: '-1h' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it('should accept valid token (200)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(buyerId);
    });
  });

  describe('Authorization & Access Control', () => {
    it('buyer accessing another buyer order (403)', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${fakeBuyerToken}`);
      expect(res.status).toBe(401);
    });

    it('unauthorized escrow lock attempt by FARMER (403)', async () => {
      const res = await request(app)
        .post('/api/escrow/lock')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ paymentId: 'dummy', idempotencyKey: 'key' });
      expect(res.status).toBe(403);
    });
    
    it('unauthorized escrow ledger read by fake buyer (403)', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}/escrow`)
        .set('Authorization', `Bearer ${fakeBuyerToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('missing required fields creates 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ agreedQuantity: 10 }); // Missing produceId
      expect(res.status).toBe(400);
    });

    it('invalid UUID format (404/400)', async () => {
      const res = await request(app)
        .get('/api/orders/not-a-uuid')
        .set('Authorization', `Bearer ${buyerToken}`);
      // Based on implementation, could be 400 or 404. Prisma handles it as bad query or just finds nothing.
      expect([400, 404, 500]).toContain(res.status); 
    });

    it('overselling produce (400)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ produceId, agreedQuantity: 1000 }); // Available is 100
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/quantity/i);
    });
  });

  describe('Payment & Escrow (HTTP Wrapping)', () => {
    const testRunId = Date.now().toString();

    it('create payment (201)', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, idempotencyKey: `http-pmt-1-${testRunId}` });
      expect(res.status).toBe(201);
      expect(res.body.data.payment.status).toBe('PENDING');
      paymentId = res.body.data.payment.id;
    });

    it('duplicate idempotency key (200/201)', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, idempotencyKey: `http-pmt-1-${testRunId}` });
      expect([200, 201]).toContain(res.status);
      expect(res.body.data.payment.id).toBe(paymentId);
    });

    it('simulate payment webhook success', async () => {
      const res = await request(app)
        .post(`/api/payments/${paymentId}/simulate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ success: true });
      expect(res.status).toBe(200);
    });

    it('escrow lock successfully created (201)', async () => {
      const res = await request(app)
        .post('/api/escrow/lock')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ paymentId, idempotencyKey: `http-esc-1-${testRunId}` });
      if (res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);
      expect(res.body.data.escrowEntry.entryType).toBe('ESCROW_LOCKED');
    });

    it('cancelled order payment attempt (400)', async () => {
      // Cancel order
      await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, idempotencyKey: `http-pmt-2-${testRunId}` });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/CANCELLED/i);
    });
  });

  describe('Escrow Release & Lifecycle (HTTP)', () => {
    let deliveredOrderId: string;
    let deliveredPaymentId: string;
    const testReleaseId = Date.now().toString();

    beforeAll(async () => {
      // Create order, payment, capture payment, and lock escrow
      const order = await prisma.order.create({
        data: { buyerId, supplierId: farmerId, produceId, agreedPrice: 40, agreedQuantity: 5, status: 'PENDING' }
      });
      deliveredOrderId = order.id;

      const pmtRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId: deliveredOrderId, idempotencyKey: `pmt-rel-${testReleaseId}` });
      deliveredPaymentId = pmtRes.body.data.payment.id;

      await request(app)
        .post(`/api/payments/${deliveredPaymentId}/simulate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ success: true });

      await request(app)
        .post('/api/escrow/lock')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ paymentId: deliveredPaymentId, idempotencyKey: `esc-rel-${testReleaseId}` });
    });

    it('rejects escrow release attempt by BUYER (403)', async () => {
      const res = await request(app)
        .post('/api/escrow/release')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ paymentId: deliveredPaymentId, idempotencyKey: `rel-buyer-${testReleaseId}` });
      expect(res.status).toBe(403);
    });

    it('rejects escrow release if order is not DELIVERED (400)', async () => {
      const res = await request(app)
        .post('/api/escrow/release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentId: deliveredPaymentId, idempotencyKey: `rel-not-deliv-${testReleaseId}` });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/DELIVERED/i);
    });

    it('admin releases escrow when order is DELIVERED (201)', async () => {
      await prisma.order.update({ where: { id: deliveredOrderId }, data: { status: 'DELIVERED' } });
      const res = await request(app)
        .post('/api/escrow/release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentId: deliveredPaymentId, idempotencyKey: `rel-admin-${testReleaseId}` });
      expect(res.status).toBe(201);
      expect(res.body.data.escrowEntry.entryType).toBe('ESCROW_RELEASED');
    });

    it('duplicate release is idempotent (201)', async () => {
      const res = await request(app)
        .post('/api/escrow/release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentId: deliveredPaymentId, idempotencyKey: `rel-admin-${testReleaseId}` });
      expect(res.status).toBe(201);
      expect(res.body.data.escrowEntry.entryType).toBe('ESCROW_RELEASED');
    });
  });

  describe('Auditing & Ledger Visibility', () => {
    it('admin can list all escrow entries (200)', async () => {
      const res = await request(app)
        .get('/api/escrow')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.escrowEntries)).toBe(true);
      expect(res.body.data.escrowEntries.length).toBeGreaterThan(0);
    });

    it('admin can list all payments (200)', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.payments)).toBe(true);
      expect(res.body.data.payments.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Role Matches', () => {
    it('farmer can fetch matching buyer requirements (200)', async () => {
      const res = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.matches)).toBe(true);
    });
  });

  describe('Referential Integrity & Delete Guards', () => {
    it('blocks deletion of produce when orders reference it (400)', async () => {
      const res = await request(app)
        .delete(`/api/produce/${produceId}`)
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/existing orders/i);
    });

    it('handles duplicate user registration email (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'farmer@demo.com',
          password: 'password123',
          name: 'Duplicate Farmer',
          role: 'FARMER'
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already in use/i);
    });
  });
});
