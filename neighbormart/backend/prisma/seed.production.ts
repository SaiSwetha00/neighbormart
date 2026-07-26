import { PrismaClient, UserRole, StaffPosition, ShiftType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database...');

  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const DEMO_PASSWORD = 'Demo@2026';

  // ─── Store ────────────────────────────────────────────────────────────────
  const store = await prisma.store.upsert({
    where: { id: 'store-prod-001' },
    update: {},
    create: {
      id: 'store-prod-001',
      name: 'NeighborMart Downtown',
      address: '123 Main Street',
      city: 'New York',
      country: 'US',
      currency: 'USD',
      timezone: 'America/New_York',
      lowStockThreshold: 10,
      salesGoal: 50000,
    },
  });
  console.log(`Store: ${store.name}`);

  // ─── Owner ────────────────────────────────────────────────────────────────
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Store Owner',
      email: 'owner@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.OWNER,
    },
  });
  console.log(`Owner: ${ownerUser.email}`);

  // ─── Manager ─────────────────────────────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Store Manager',
      email: 'manager@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.MANAGER,
    },
  });
  await prisma.manager.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      storeId: store.id,
      permissions: { inventory: true, staff: true, orders: true },
    },
  });
  console.log(`Manager: ${managerUser.email}`);

  // ─── Staff — Cashier ──────────────────────────────────────────────────────
  const cashierUser = await prisma.user.upsert({
    where: { email: 'staff.cashier@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Michael Chen',
      email: 'staff.cashier@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.STAFF,
    },
  });
  await prisma.staff.upsert({
    where: { userId: cashierUser.id },
    update: {},
    create: {
      userId: cashierUser.id,
      storeId: store.id,
      employeeId: 'EMP-001',
      position: StaffPosition.CASHIER,
      shiftType: ShiftType.MORNING,
    },
  });
  console.log(`Staff (Cashier): ${cashierUser.email}`);

  // ─── Driver ───────────────────────────────────────────────────────────────
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Alex Driver',
      email: 'driver@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.DRIVER,
    },
  });
  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      storeId: store.id,
      vehicleType: 'CAR',
      vehiclePlate: 'NM-001',
    },
  });
  console.log(`Driver: ${driverUser.email}`);

  // ─── Customer ─────────────────────────────────────────────────────────────
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Jane Customer',
      email: 'customer@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.CUSTOMER,
    },
  });
  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      storeId: store.id,
      loyaltyPoints: 250,
    },
  });
  console.log(`Customer: ${customerUser.email}`);

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@neighbormart.com' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Super Admin',
      email: 'admin@neighbormart.com',
      password: await hash(DEMO_PASSWORD),
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log(`Super Admin: ${adminUser.email}`);

  // ─── Default Grocery Categories ──────────────────────────────────────────
  const categories = [
    'Fruits & Vegetables',
    'Dairy & Eggs',
    'Meat & Poultry',
    'Seafood',
    'Bakery & Bread',
    'Beverages',
    'Snacks & Chips',
    'Frozen Foods',
    'Canned & Packaged',
    'Condiments & Sauces',
    'Breakfast & Cereals',
    'Pasta & Rice',
    'Cleaning & Household',
    'Personal Care & Beauty',
    'Baby & Kids',
    'Pet Supplies',
    'Health & Wellness',
    'International Foods',
  ];

  await prisma.category.createMany({
    skipDuplicates: true,
    data: categories.map((name) => ({ storeId: store.id, name })),
  });
  console.log(`Categories: ${categories.length} grocery categories seeded`);

  console.log('\nProduction seed complete.');
  console.log('Demo password for all accounts: Demo@2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
