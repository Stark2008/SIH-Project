import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : [],
};

// Validate configuration
export function validateEnv() {
  if (ENV.NODE_ENV === 'production') {
    if (!ENV.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is missing in production.');
      process.exit(1);
    }
  }

  if (!ENV.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is missing. Prisma may fail to connect.');
  }

  if (ENV.CORS_ORIGINS.length === 0) {
    if (ENV.NODE_ENV === 'production') {
      console.warn('WARNING: CORS_ORIGINS is empty in production. The API may reject all cross-origin requests.');
    } else {
      // In development, default to local vite port if missing
      ENV.CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    }
  }
}
