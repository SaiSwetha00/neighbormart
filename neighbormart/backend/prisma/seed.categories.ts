import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
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
  'Store & Packaging Supplies'
]

async function main() {
  console.log('Seeding categories...')

  const store = await prisma.store.findFirst({
    where: { id: 'demo-store-001' }
  })

  if (!store) {
    console.log('Store not found!')
    return
  }

  for (const name of categories) {
    await prisma.category.upsert({
      where: {
        id: name.toLowerCase()
               .replace(/[^a-z0-9]/g, '-')
      },
      update: {},
      create: {
        name,
        storeId: store.id
      }
    })
    console.log('Created:', name)
  }

  console.log('All 18 categories seeded!')
  await prisma.$disconnect()
}

main().catch(console.error)
