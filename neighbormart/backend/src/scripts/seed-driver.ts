import 'dotenv/config';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'driver@neighbormart.com' },
    update: {},
    create: {
      email: 'driver@neighbormart.com',
      password: hash,
      name: 'Ravi Kumar',
      role: 'DRIVER',
      status: 'ACTIVE',
      storeId: 'demo-store-001',
    },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      storeId: 'demo-store-001',
      vehicleType: 'BIKE',
      vehiclePlate: 'KA01AB1234',
      status: 'OFFLINE',
      isAvailable: false,
      rating: 4.8,
    },
  });

  console.log('Driver user:', user.email, user.id);
  console.log('Driver profile:', driver.id);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
