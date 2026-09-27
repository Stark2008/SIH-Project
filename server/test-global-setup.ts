import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

export default async function setup() {
  // Load .env.test for global setup context
  dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });
  process.env.DATABASE_URL = 'file:./test.db';

  console.log('--- Initializing Test Database (test.db) ---');
  execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit', env: process.env });
  
  console.log('--- Seeding Test Database ---');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', env: process.env });
}
