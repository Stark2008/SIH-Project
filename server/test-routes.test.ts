import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './src/index'; // Need to export app from index, or mock the router
import { prisma } from './src/prismaClient';
import jwt from 'jsonwebtoken';

describe('Route Validation Coverage', () => {
  let buyerToken: string;
  let buyerId: string;
  let produceId: string;
  let orderId: string;

  beforeAll(async () => {
    const buyer = await prisma.user.create({
      data: { email: `buyer-route-${Date.now()}@test.com`, passwordHash: 'hash', name: 'Buyer Route', role: 'BUYER' }
    });
    buyerId = buyer.id;
    buyerToken = jwt.sign({ userId: buyer.id, email: buyer.email, role: buyer.role }, process.env.JWT_SECRET || 'dev-secret');

    const supplier = await prisma.user.create({
      data: { email: `supplier-route-${Date.now()}@test.com`, passwordHash: 'hash', name: 'Supplier Route', role: 'FARMER' }
    });

    const produce = await prisma.produce.create({
      data: { supplierId: supplier.id, crop: 'Apples', quantity: 100, harvestDate: new Date(), location: 'Farm', qualityGrade: 'A', expectedPrice: 50, status: 'AVAILABLE' }
    });
    produceId = produce.id;

    const order = await prisma.order.create({
      data: { produceId, buyerId, supplierId: supplier.id, agreedQuantity: 10, agreedPrice: 50, status: 'PENDING' }
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.produce.deleteMany({ where: { id: produceId } });
    await prisma.user.deleteMany({ where: { id: buyerId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'supplier-route-' } } });
  });

  it('Valid identifier works', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Invalid identifier returns 400 Bad Request', async () => {
    const res = await request(app).get('/api/orders/not-a-uuid').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid order ID format');
  });

  it('Nonexistent identifier returns 404', async () => {
    const fakeUuid = '123e4567-e89b-42d3-a456-426614174000'; // valid v4
    const res = await request(app).get(`/api/orders/${fakeUuid}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(404);
  });
});
