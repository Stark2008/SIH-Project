import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Use a clearly documented development-only password for seeded demo users.
  // Password: password123
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Farmer
  const farmer = await prisma.user.upsert({
    where: { email: 'farmer@demo.com' },
    update: { passwordHash },
    create: {
      email: 'farmer@demo.com',
      passwordHash,
      name: 'Demo Farmer',
      location: 'Karnataka',
      role: 'FARMER',
    },
  });

  // Create FPO
  const fpo = await prisma.user.upsert({
    where: { email: 'fpo@demo.com' },
    update: { passwordHash },
    create: {
      email: 'fpo@demo.com',
      passwordHash,
      name: 'Demo FPO',
      location: 'Karnataka',
      role: 'FPO',
    },
  });

  // Create Buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.com' },
    update: { passwordHash },
    create: {
      email: 'buyer@demo.com',
      passwordHash,
      name: 'Demo Buyer',
      location: 'Bengaluru',
      role: 'BUYER',
    },
  });

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash },
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Demo Admin',
      location: 'Delhi',
      role: 'ADMIN',
    },
  });

  console.log('Users seeded');

  // Create Produce if not exists (we use a unique condition trick or just check if they exist, but upsert needs a unique field. Since crop isn't unique, we can check count)
  let produce = await prisma.produce.findFirst({ where: { supplierId: farmer.id } });
  if (!produce) {
    produce = await prisma.produce.create({
      data: {
        supplierId: farmer.id,
        crop: 'Tomato',
        quantity: 500,
        harvestDate: new Date('2026-09-12T00:00:00Z'),
        location: 'Karnataka',
        qualityGrade: 'Grade A',
        expectedPrice: 29,
        status: 'AVAILABLE',
      },
    });
    console.log('Produce seeded');
  }

  // Create Requirement if not exists
  let req = await prisma.requirement.findFirst({ where: { buyerId: buyer.id } });
  if (!req) {
    req = await prisma.requirement.create({
      data: {
        buyerId: buyer.id,
        crop: 'Tomato',
        quantity: 1000,
        qualityGrade: 'Grade A',
        deliveryLocation: 'Bengaluru · 15 Sep',
        status: 'OPEN',
      },
    });
    console.log('Requirement seeded');
  }

  // Create Order if not exists
  let order = await prisma.order.findFirst({ where: { produceId: produce.id } });
  if (!order) {
    order = await prisma.order.create({
      data: {
        produceId: produce.id,
        requirementId: req.id,
        buyerId: buyer.id,
        supplierId: farmer.id,
        agreedQuantity: 500,
        agreedPrice: 28,
        status: 'CONFIRMED',
        events: {
          create: [
            {
              status: 'CONFIRMED',
              description: 'Order confirmed between Demo Buyer and Demo Farmer',
              location: 'Karnataka',
            }
          ]
        }
      },
    });
    console.log('Order seeded');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
