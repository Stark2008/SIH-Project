import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv, ENV } from './src/config/env';

describe('Environment Validation', () => {
  let exitSpy: any;
  let errorSpy: any;
  let warnSpy: any;
  let originalEnv: NodeJS.ProcessEnv;
  let originalENV: any;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Save original state
    originalEnv = { ...process.env };
    originalENV = { ...ENV };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    Object.assign(ENV, originalENV);
  });

  it('development with valid configuration', () => {
    ENV.NODE_ENV = 'development';
    ENV.CORS_ORIGINS = ['http://localhost:5173'];
    ENV.JWT_SECRET = 'dev-secret';
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('production with valid JWT secret', () => {
    ENV.NODE_ENV = 'production';
    ENV.CORS_ORIGINS = ['http://prod.com'];
    ENV.JWT_SECRET = 'secure-secret';
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('production with missing JWT secret', () => {
    ENV.NODE_ENV = 'production';
    ENV.JWT_SECRET = undefined;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET is missing'));
  });

  it('production with empty JWT secret', () => {
    ENV.NODE_ENV = 'production';
    ENV.JWT_SECRET = '';
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET is missing'));
  });

  it('production with missing CORS configuration', () => {
    ENV.NODE_ENV = 'production';
    ENV.JWT_SECRET = 'secure';
    ENV.CORS_ORIGINS = [];
    validateEnv();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CORS_ORIGINS is empty in production'));
  });

  it('development fallback behavior for missing CORS', () => {
    ENV.NODE_ENV = 'development';
    ENV.CORS_ORIGINS = [];
    validateEnv();
    expect(ENV.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });
});
