import dotenv from 'dotenv';
import path from 'path';

// Load .env.test before anything else
dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });

// Ensure we are using the test database
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '3002';
