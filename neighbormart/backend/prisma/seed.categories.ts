import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORE_ID = 'store-prod-001';

const CATEGORIES = [
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

async function main() {
  console.log(`Seeding ${CATEGORIES.length} grocery categories for store ${STORE_ID}...`);

  const result = await prisma.category.createMany({
    skipDuplicates: true,
    data: CATEGORIES.map((name) => ({ storeId: STORE_ID, name })),
  });

  console.log(`Done. Created ${result.count} categories (skipped duplicates).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
