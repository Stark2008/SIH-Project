import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { ENV } from './src/config/env';

describe('CORS Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
  });

  const setupCorsApp = (origins: string[]) => {
    app.use(cors({ origin: origins }));
    app.get('/api/health', (req, res) => res.json({ ok: true }));
  };

  it('allowed configured origin', async () => {
    setupCorsApp(['http://allowed.com']);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://allowed.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.com');
  });

  it('unapproved origin', async () => {
    setupCorsApp(['http://allowed.com']);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://unapproved.com');
    expect(res.status).toBe(200);
    // CORS middleware skips adding headers if origin is not allowed
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('missing origin', async () => {
    setupCorsApp(['http://allowed.com']);
    const res = await request(app)
      .get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('multiple configured origins', async () => {
    setupCorsApp(['http://site1.com', 'http://site2.com']);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://site2.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://site2.com');
  });

  it('production with empty allowlist', async () => {
    setupCorsApp([]);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://allowed.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
