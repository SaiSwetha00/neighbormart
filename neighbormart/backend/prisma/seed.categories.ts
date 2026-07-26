import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORE_ID = 'demo-store-001';

const CATEGORIES = [
  'Dairy & Eggs',
  'Bakery & Bread',
  'Meat, Poultry & Seafood',
  'Fresh Vegetables',
  'Fresh Fruits',
  'Grains, Rice & Flour',
  'Cooking Essentials & Spices',
  'Packaged & Canned Foods',
  'Beverages',
  'Snacks & Confectionery',
  'Personal Care & Hygiene',
  'Household & Cleaning',
  'Baby & Kids',
  'Health & Wellness',
  'Frozen Foods',
  'Ready-to-Eat & Deli',
  'Organic & Specialty',
  'Store & Packaging Supplies',
];

async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { storeId_name: { storeId: STORE_ID, name } },
      update: {},
      create: { storeId: STORE_ID, name },
    });
    console.log(`Seeded: ${name}`);
  }
  console.log('All categories seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
