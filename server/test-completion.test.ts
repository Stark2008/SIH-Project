import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './src/index';
import { prisma } from './src/prismaClient';
import jwt from 'jsonwebtoken';

describe('Backend Completion & Data Integrity Tests', () => {
  let buyerToken: string;
  let farmer1Token: string;
  let farmer2Token: string;
  let adminToken: string;
  let buyerId: string;
  let farmer1Id: string;
  let farmer2Id: string;

  beforeAll(async () => {
    // 1. Seed or find users
    let buyer = await prisma.user.findFirst({ where: { email: 'buyer.completion@demo.com' } });
    if (!buyer) buyer = await prisma.user.create({ data: { email: 'buyer.completion@demo.com', passwordHash: 'hash', name: 'Buyer C', role: 'BUYER' } });
    
    let farmer1 = await prisma.user.findFirst({ where: { email: 'farmer1.completion@demo.com' } });
    if (!farmer1) farmer1 = await prisma.user.create({ data: { email: 'farmer1.completion@demo.com', passwordHash: 'hash', name: 'Farmer 1C', role: 'FARMER' } });

    let farmer2 = await prisma.user.findFirst({ where: { email: 'farmer2.completion@demo.com' } });
    if (!farmer2) farmer2 = await prisma.user.create({ data: { email: 'farmer2.completion@demo.com', passwordHash: 'hash', name: 'Farmer 2C', role: 'FARMER' } });

    let admin = await prisma.user.findFirst({ where: { email: 'admin.completion@demo.com' } });
    if (!admin) admin = await prisma.user.create({ data: { email: 'admin.completion@demo.com', passwordHash: 'hash', name: 'Admin C', role: 'ADMIN' } });

    buyerId = buyer.id;
    farmer1Id = farmer1.id;
    farmer2Id = farmer2.id;

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    buyerToken = jwt.sign({ userId: buyer.id, role: buyer.role }, secret, { expiresIn: '1h' });
    farmer1Token = jwt.sign({ userId: farmer1.id, role: farmer1.role }, secret, { expiresIn: '1h' });
    farmer2Token = jwt.sign({ userId: farmer2.id, role: farmer2.role }, secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: admin.id, role: admin.role }, secret, { expiresIn: '1h' });
  });

  describe('Authorization & Produce', () => {
    let f1ProduceId: string;

    it('farmer1 creates produce', async () => {
      const res = await request(app)
        .post('/api/produce')
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ crop: 'Tomatoes', quantity: 100, harvestDate: '2027-01-01', location: 'Farm', qualityGrade: 'A', expectedPrice: 50 });
      expect(res.status).toBe(201);
      f1ProduceId = res.body.data.produce.id;
    });

    it('farmer2 cannot modify farmer1 produce', async () => {
      const res = await request(app)
        .patch(`/api/produce/${f1ProduceId}`)
        .set('Authorization', `Bearer ${farmer2Token}`)
        .send({ quantity: 500 });
      expect(res.status).toBe(403);
    });

    it('farmer2 cannot delete farmer1 produce', async () => {
      const res = await request(app)
        .delete(`/api/produce/${f1ProduceId}`)
        .set('Authorization', `Bearer ${farmer2Token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Inventory & Orders Lifecycle', () => {
    let produceId: string;
    let orderId: string;

    beforeAll(async () => {
      const produce = await prisma.produce.create({
        data: { supplierId: farmer1Id, crop: 'Onions', quantity: 200, harvestDate: new Date(), location: 'Farm', qualityGrade: 'A', expectedPrice: 30 }
      });
      produceId = produce.id;
    });

    it('buyer creates order successfully, deducting inventory', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ produceId, quantity: 50 });
      expect(res.status).toBe(201);
      orderId = res.body.data.order.id;

      // Database assertion
      const produce = await prisma.produce.findUnique({ where: { id: produceId } });
      expect(produce?.quantity).toBe(150);
    });

    it('supplier (farmer2) cannot access farmer1 order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${farmer2Token}`);
      expect(res.status).toBe(403);
    });

    it('order cancellation restores inventory exactly once', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'CANCELLED' });
      expect(res.status).toBe(200);

      // Database assertion for inventory
      const produce = await prisma.produce.findUnique({ where: { id: produceId } });
      expect(produce?.quantity).toBe(200);

      // Try cancelling again (duplicate)
      const duplicateRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'CANCELLED' });
      expect(duplicateRes.status).toBe(400); // NO_CHANGE

      const doubleCheckProduce = await prisma.produce.findUnique({ where: { id: produceId } });
      expect(doubleCheckProduce?.quantity).toBe(200);
    });
  });
});
