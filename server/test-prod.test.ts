import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Set NODE_ENV to production before importing the app
process.env.NODE_ENV = 'production';
import app from './src/index';
import jwt from 'jsonwebtoken';
import { prisma } from './src/prismaClient';

describe('Production Mode Security Guards', () => {
  it('should block mock payment webhook simulation in production', async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign({ userId: buyer!.id, role: 'BUYER' }, secret, { expiresIn: '1h' });

    const res = await request(app)
      .post('/api/payments/dummy-payment-id/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send({ success: true });
    
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/disabled in production/i);
  });
});
