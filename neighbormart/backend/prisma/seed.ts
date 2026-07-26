import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEMO_STORE_ID = 'demo-store-001';

/** Returns the Monday of the current ISO week at midnight UTC */
function getWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun … 6 = Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns date offset by N calendar days from base */
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Cleanup (idempotent re-run support) ─────────────────────────────────────

async function cleanup() {
  console.log('Cleaning up existing demo data...');

  const storeExists = await prisma.store.findUnique({ where: { id: DEMO_STORE_ID } });
  if (!storeExists) {
    console.log('  No existing demo data found — skipping cleanup.\n');
    return;
  }

  // Delete Phase 2 data first (most-derived)
  await prisma.notification.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.pOSSession.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.giftCard.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.complaint.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.review.deleteMany({ where: { customer: { storeId: DEMO_STORE_ID } } });
  await prisma.taxConfig.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.expense.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.coupon.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.promotion.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.referral.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.loyaltyTransaction.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.returnItem.deleteMany({ where: { return: { storeId: DEMO_STORE_ID } } });
  await prisma.return.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.orderTracking.deleteMany({ where: { order: { storeId: DEMO_STORE_ID } } });
  await prisma.orderItem.deleteMany({ where: { order: { storeId: DEMO_STORE_ID } } });
  await prisma.order.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.shoppingListItem.deleteMany({ where: { list: { customer: { storeId: DEMO_STORE_ID } } } });
  await prisma.shoppingList.deleteMany({ where: { customer: { storeId: DEMO_STORE_ID } } });
  await prisma.wishlistItem.deleteMany({ where: { wishlist: { customer: { storeId: DEMO_STORE_ID } } } });
  await prisma.wishlist.deleteMany({ where: { customer: { storeId: DEMO_STORE_ID } } });
  await prisma.savedAddress.deleteMany({ where: { customer: { storeId: DEMO_STORE_ID } } });
  await prisma.customer.deleteMany({ where: { storeId: DEMO_STORE_ID } });

  // Delete Phase 1 data
  await prisma.auditLog.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.dailyAudit.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.wasteLog.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.stockAdjustment.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.attendance.deleteMany({ where: { staff: { storeId: DEMO_STORE_ID } } });
  await prisma.shift.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.leaveRequest.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.supplierPayment.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.gRNItem.deleteMany({ where: { grn: { purchaseOrder: { storeId: DEMO_STORE_ID } } } });
  await prisma.goodsReceived.deleteMany({ where: { purchaseOrder: { storeId: DEMO_STORE_ID } } });
  await prisma.pOItem.deleteMany({ where: { purchaseOrder: { storeId: DEMO_STORE_ID } } });
  await prisma.purchaseOrder.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.productBatch.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.priceHistory.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productSubstitute.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productAllergen.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productDietaryTag.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productNutrition.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productImage.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.productVariant.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.brand.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.supplier.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.manager.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.staff.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.loginHistory.deleteMany({ where: { user: { storeId: DEMO_STORE_ID } } });
  await prisma.session.deleteMany({ where: { user: { storeId: DEMO_STORE_ID } } });
  await prisma.user.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.store.delete({ where: { id: DEMO_STORE_ID } });

  console.log('  Cleanup complete.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('========================================');
  console.log('  NeighborMart Database Seed');
  console.log('========================================\n');

  await cleanup();

  const now = new Date();

  // ── 1. Store ────────────────────────────────────────────────────────────────

  let store: Awaited<ReturnType<typeof prisma.store.upsert>>;
  try {
    console.log('Creating store...');
    store = await prisma.store.upsert({
      where: { id: DEMO_STORE_ID },
      update: {},
      create: {
        id: DEMO_STORE_ID,
        name: 'NeighborMart Demo Store',
        address: '123 Main Street',
        city: 'Springfield',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        lowStockThreshold: 10,
        salesGoal: 5000,
        status: 'ACTIVE',
      },
    });
    console.log(`  Store created: "${store.name}" (id: ${store.id})\n`);
  } catch (e) {
    console.error('FATAL: Store seed failed:', e);
    throw e;
  }

  // ── 2. 18 Categories ────────────────────────────────────────────────────────

  let cats: Record<string, string> = {}; // name → id
  try {
    console.log('Creating categories...');
    const categoryDefs = [
      { name: 'Dairy & Eggs',               icon: '🥛', sortOrder: 1  },
      { name: 'Bakery & Bread',             icon: '🍞', sortOrder: 2  },
      { name: 'Meat, Poultry & Seafood',    icon: '🥩', sortOrder: 3  },
      { name: 'Fresh Vegetables',           icon: '🥦', sortOrder: 4  },
      { name: 'Fresh Fruits',               icon: '🍎', sortOrder: 5  },
      { name: 'Grains, Rice & Flour',       icon: '🌾', sortOrder: 6  },
      { name: 'Cooking Essentials & Spices',icon: '🌶️', sortOrder: 7  },
      { name: 'Packaged & Canned Foods',    icon: '🥫', sortOrder: 8  },
      { name: 'Beverages',                  icon: '🥤', sortOrder: 9  },
      { name: 'Snacks & Confectionery',     icon: '🍫', sortOrder: 10 },
      { name: 'Personal Care & Hygiene',    icon: '🧴', sortOrder: 11 },
      { name: 'Household & Cleaning',       icon: '🧹', sortOrder: 12 },
      { name: 'Baby & Kids',               icon: '👶', sortOrder: 13 },
      { name: 'Health & Wellness',          icon: '💊', sortOrder: 14 },
      { name: 'Frozen Foods',               icon: '🧊', sortOrder: 15 },
      { name: 'Ready-to-Eat & Deli',        icon: '🥪', sortOrder: 16 },
      { name: 'Organic & Specialty',        icon: '🌿', sortOrder: 17 },
      { name: 'Store & Packaging Supplies', icon: '📦', sortOrder: 18 },
    ];
    for (const def of categoryDefs) {
      const catId = def.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const c = await prisma.category.upsert({
        where: { id: catId },
        update: {},
        create: { id: catId, storeId: store.id, ...def },
      });
      cats[def.name] = c.id;
      console.log(`  ${def.icon}  ${def.name}`);
    }
    console.log();
  } catch (e) {
    console.error('FATAL: Categories seed failed:', e);
    throw e;
  }

  // ── 3. 5 Brands ─────────────────────────────────────────────────────────────

  console.log('Creating brands...');
  const brandNames = ['FreshFarm', 'NatureBest', 'HomeChoice', 'DailyEssentials', 'PureGold'];
  const brands: Record<string, string> = {}; // name → id
  for (const name of brandNames) {
    const brandId = `brand-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const b = await prisma.brand.upsert({ where: { id: brandId }, update: {}, create: { id: brandId, storeId: store.id, name } });
    brands[name] = b.id;
    console.log(`  Brand: ${name}`);
  }
  console.log();

  // ── 4. 3 Suppliers ──────────────────────────────────────────────────────────

  console.log('Creating suppliers...');
  const supplierDefs = [
    {
      name: 'FreshDirect Wholesale',
      contactPerson: 'Robert Brown',
      phone: '+1-555-0101',
      email: 'orders@freshdirect.com',
      address: '45 Warehouse Blvd, Springfield, IL 62701',
      paymentTerms: 'Net 30',
      leadTimeDays: 2,
      rating: 4.5,
      notes: 'Primary dairy and produce supplier. Reliable next-day delivery.',
    },
    {
      name: 'Metro Grocery Supply',
      contactPerson: 'Linda Garcia',
      phone: '+1-555-0202',
      email: 'supply@metrogrocery.com',
      address: '88 Commerce Park, Shelbyville, IL 62565',
      paymentTerms: 'Net 15',
      leadTimeDays: 3,
      rating: 4.2,
      notes: 'Packaged goods, snacks, and household products.',
    },
    {
      name: 'NaturalGoods Distributors',
      contactPerson: 'Thomas Lee',
      phone: '+1-555-0303',
      email: 'hello@naturalgoods.com',
      address: '12 Organic Way, Capital City, IL 62702',
      paymentTerms: 'Net 45',
      leadTimeDays: 5,
      rating: 4.8,
      notes: 'Organic, specialty, and health products. Premium quality.',
    },
  ];

  const suppliers: string[] = []; // ids in order
  for (const def of supplierDefs) {
    const supplierId = `supplier-${def.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const s = await prisma.supplier.upsert({ where: { id: supplierId }, update: {}, create: { id: supplierId, storeId: store.id, ...def } });
    suppliers.push(s.id);
    console.log(`  Supplier: ${def.name} (lead time: ${def.leadTimeDays} days, rating: ${def.rating})`);
  }
  console.log();

  // ── 5. Password hash + Users (owner, manager, staff) ────────────────────────

  let ownerUser: Awaited<ReturnType<typeof prisma.user.upsert>>;
  let managerUser: Awaited<ReturnType<typeof prisma.user.upsert>>;
  const staffRecords: { userId: string; staffId: string; position: string }[] = [];

  try {
    console.log('Hashing passwords...');
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('  Done.\n');

    console.log('Creating users...');
    ownerUser = await prisma.user.upsert({
      where: { email: 'owner@neighbormart.com' },
      update: {},
      create: {
        storeId: store.id,
        name: 'Alex Johnson',
        email: 'owner@neighbormart.com',
        password: passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`  Owner created: ${ownerUser.name} <${ownerUser.email}>`);

    managerUser = await prisma.user.upsert({
      where: { email: 'manager@neighbormart.com' },
      update: {},
      create: {
        storeId: store.id,
        name: 'Sarah Williams',
        email: 'manager@neighbormart.com',
        password: passwordHash,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });

    await prisma.manager.upsert({
      where: { userId: managerUser.id },
      update: {},
      create: {
        userId: managerUser.id,
        storeId: store.id,
        assignedBy: ownerUser.id,
        permissions: {
          viewSales: true,
          manageInventory: true,
          manageProducts: true,
          manageStaff: true,
          viewReports: true,
          processReturns: true,
          viewCustomers: true,
          manageSuppliers: true,
        },
        status: 'ACTIVE',
      },
    });
    console.log(`  Manager created: ${managerUser.name} <${managerUser.email}>`);

    const staffInputs = [
      {
        name: 'Michael Chen',
        email: 'staff.cashier@neighbormart.com',
        position: 'CASHIER' as const,
        shiftType: 'MORNING' as const,
        employeeId: 'NM-001',
      },
      {
        name: 'Emma Davis',
        email: 'staff.stock@neighbormart.com',
        position: 'STOCK' as const,
        shiftType: 'EVENING' as const,
        employeeId: 'NM-002',
      },
      {
        name: 'James Wilson',
        email: 'staff.supervisor@neighbormart.com',
        position: 'SUPERVISOR' as const,
        shiftType: 'FULL_DAY' as const,
        employeeId: 'NM-003',
      },
    ];

    for (const input of staffInputs) {
      const staffUser = await prisma.user.upsert({
        where: { email: input.email },
        update: {},
        create: {
          storeId: store.id,
          name: input.name,
          email: input.email,
          password: passwordHash,
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });
      const staffRecord = await prisma.staff.upsert({
        where: { userId: staffUser.id },
        update: {},
        create: {
          userId: staffUser.id,
          storeId: store.id,
          employeeId: input.employeeId,
          position: input.position,
          shiftType: input.shiftType,
          status: 'ACTIVE',
          createdBy: ownerUser.id,
        },
      });
      staffRecords.push({ userId: staffUser.id, staffId: staffRecord.id, position: input.position });
      console.log(`  Staff created: ${input.name} (${input.position}, ${input.employeeId})`);
    }
    console.log();
  } catch (e) {
    console.error('FATAL: Users seed failed:', e);
    throw e;
  }

  // ── 6. 20 Products ──────────────────────────────────────────────────────────

  let products: Record<string, string> = {}; // sku → id
  try {
    console.log('Creating products...');

    const baseProduct = {
      storeId: store.id,
      createdBy: ownerUser.id,
      taxRate: 0,
      packSize: 1,
      isOrganic: false,
      isVegan: false,
      isGlutenFree: false,
      isHalal: false,
      isKosher: false,
      isPerishable: false,
      isRecyclable: false,
      status: 'ACTIVE' as const,
    };

    const productDefs = [
      // 1. Dairy & Eggs
      {
        name: 'Whole Milk 1L',
        sku: 'NM-DAIRY-001',
        categoryId: cats['Dairy & Eggs'],
        brandId: brands['FreshFarm'],
        purchasePrice: 2.20,
        sellingPrice: 3.49,
        stockQty: 45,
        lowStockThreshold: 15,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'litre',
        description: 'Fresh whole milk, pasteurised and homogenised',
      },
      // 2. Bakery & Bread
      {
        name: 'Sourdough Bread 800g',
        sku: 'NM-BAKE-001',
        categoryId: cats['Bakery & Bread'],
        brandId: brands['NatureBest'],
        purchasePrice: 3.10,
        sellingPrice: 4.99,
        stockQty: 12,
        lowStockThreshold: 8,
        storageType: 'AMBIENT' as const,
        isPerishable: true,
        unitOfMeasure: 'loaf',
        description: 'Artisan sourdough bread, slow-fermented',
      },
      // 3. Meat, Poultry & Seafood
      {
        name: 'Chicken Breast 500g',
        sku: 'NM-MEAT-001',
        categoryId: cats['Meat, Poultry & Seafood'],
        brandId: brands['FreshFarm'],
        purchasePrice: 5.80,
        sellingPrice: 8.99,
        stockQty: 28,
        lowStockThreshold: 10,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'pack',
        description: 'Fresh boneless skinless chicken breast',
      },
      // 4. Fresh Vegetables — LOW STOCK (8 < threshold 10)
      {
        name: 'Baby Spinach 200g',
        sku: 'NM-VEG-001',
        categoryId: cats['Fresh Vegetables'],
        brandId: brands['FreshFarm'],
        purchasePrice: 1.80,
        sellingPrice: 3.29,
        stockQty: 8,
        lowStockThreshold: 10,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'bag',
        description: 'Tender baby spinach leaves, pre-washed',
      },
      // 5. Fresh Fruits — Organic
      {
        name: 'Organic Apples 1kg',
        sku: 'NM-FRUIT-001',
        categoryId: cats['Fresh Fruits'],
        brandId: brands['NatureBest'],
        purchasePrice: 3.40,
        sellingPrice: 5.49,
        stockQty: 35,
        lowStockThreshold: 12,
        storageType: 'AMBIENT' as const,
        isOrganic: true,
        unitOfMeasure: 'kg',
        description: 'Certified organic mixed apples',
      },
      // 6. Grains, Rice & Flour
      {
        name: 'Basmati Rice 2kg',
        sku: 'NM-GRAIN-001',
        categoryId: cats['Grains, Rice & Flour'],
        brandId: brands['DailyEssentials'],
        purchasePrice: 4.50,
        sellingPrice: 6.99,
        stockQty: 60,
        lowStockThreshold: 20,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'bag',
        description: 'Premium aged long-grain basmati rice',
      },
      // 7. Cooking Essentials & Spices
      {
        name: 'Olive Oil Extra Virgin 500ml',
        sku: 'NM-COOK-001',
        categoryId: cats['Cooking Essentials & Spices'],
        brandId: brands['PureGold'],
        purchasePrice: 8.20,
        sellingPrice: 12.99,
        stockQty: 22,
        lowStockThreshold: 8,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'bottle',
        description: 'Cold-pressed extra virgin olive oil',
      },
      // 8. Packaged & Canned Foods — OUT OF STOCK (0)
      {
        name: 'Tomato Soup 400g',
        sku: 'NM-CAN-001',
        categoryId: cats['Packaged & Canned Foods'],
        brandId: brands['HomeChoice'],
        purchasePrice: 1.10,
        sellingPrice: 1.99,
        stockQty: 0,
        lowStockThreshold: 15,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'can',
        description: 'Classic cream of tomato soup',
      },
      // 9. Beverages
      {
        name: 'Orange Juice 1L',
        sku: 'NM-BEV-001',
        categoryId: cats['Beverages'],
        brandId: brands['FreshFarm'],
        purchasePrice: 2.40,
        sellingPrice: 3.79,
        stockQty: 31,
        lowStockThreshold: 12,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'bottle',
        description: 'Freshly squeezed orange juice, not from concentrate',
      },
      // 10. Snacks & Confectionery
      {
        name: 'Dark Chocolate 100g',
        sku: 'NM-SNACK-001',
        categoryId: cats['Snacks & Confectionery'],
        brandId: brands['NatureBest'],
        purchasePrice: 1.60,
        sellingPrice: 2.49,
        stockQty: 55,
        lowStockThreshold: 20,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'bar',
        description: '70% dark chocolate, single origin',
      },
      // 11. Personal Care & Hygiene
      {
        name: 'Shampoo 400ml',
        sku: 'NM-CARE-001',
        categoryId: cats['Personal Care & Hygiene'],
        brandId: brands['DailyEssentials'],
        purchasePrice: 4.30,
        sellingPrice: 6.99,
        stockQty: 18,
        lowStockThreshold: 8,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'bottle',
        description: 'Daily moisturising shampoo for all hair types',
      },
      // 12. Household & Cleaning
      {
        name: 'Dish Soap 500ml',
        sku: 'NM-CLEAN-001',
        categoryId: cats['Household & Cleaning'],
        brandId: brands['HomeChoice'],
        purchasePrice: 1.80,
        sellingPrice: 2.99,
        stockQty: 42,
        lowStockThreshold: 15,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'bottle',
        description: 'Concentrated dish washing liquid, lemon scent',
      },
      // 13. Baby & Kids
      {
        name: 'Baby Diapers Size 3',
        sku: 'NM-BABY-001',
        categoryId: cats['Baby & Kids'],
        brandId: brands['PureGold'],
        purchasePrice: 10.00,
        sellingPrice: 14.99,
        stockQty: 15,
        lowStockThreshold: 8,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'pack',
        description: 'Ultra-soft diapers for 6–10 kg babies, 52 per pack',
      },
      // 14. Health & Wellness — LOW STOCK (7 < threshold 10)
      {
        name: 'Vitamin C 1000mg 60 tabs',
        sku: 'NM-HLTH-001',
        categoryId: cats['Health & Wellness'],
        brandId: brands['PureGold'],
        purchasePrice: 5.20,
        sellingPrice: 8.49,
        stockQty: 7,
        lowStockThreshold: 10,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'box',
        description: 'High-strength Vitamin C tablets with zinc, 60-count',
      },
      // 15. Frozen Foods
      {
        name: 'Frozen Peas 500g',
        sku: 'NM-FRZN-001',
        categoryId: cats['Frozen Foods'],
        brandId: brands['FreshFarm'],
        purchasePrice: 1.40,
        sellingPrice: 2.29,
        stockQty: 38,
        lowStockThreshold: 15,
        storageType: 'FROZEN' as const,
        isPerishable: true,
        unitOfMeasure: 'bag',
        description: 'Garden peas, flash frozen within hours of harvest',
      },
      // 16. Dairy & Eggs
      {
        name: 'Greek Yogurt 500g',
        sku: 'NM-DAIRY-002',
        categoryId: cats['Dairy & Eggs'],
        brandId: brands['NatureBest'],
        purchasePrice: 2.80,
        sellingPrice: 4.49,
        stockQty: 24,
        lowStockThreshold: 10,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'tub',
        description: 'Thick strained Greek-style yogurt, full fat',
      },
      // 17. Dairy & Eggs — LOW STOCK (9 < threshold 10)
      {
        name: 'Cheddar Cheese 200g',
        sku: 'NM-DAIRY-003',
        categoryId: cats['Dairy & Eggs'],
        brandId: brands['FreshFarm'],
        purchasePrice: 3.80,
        sellingPrice: 5.99,
        stockQty: 9,
        lowStockThreshold: 10,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'block',
        description: 'Mature cheddar cheese, 12 months aged',
      },
      // 18. Grains, Rice & Flour
      {
        name: 'Pasta Penne 500g',
        sku: 'NM-GRAIN-002',
        categoryId: cats['Grains, Rice & Flour'],
        brandId: brands['DailyEssentials'],
        purchasePrice: 1.20,
        sellingPrice: 1.99,
        stockQty: 67,
        lowStockThreshold: 25,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'pack',
        description: 'Durum wheat semolina penne rigate',
      },
      // 19. Household & Cleaning
      {
        name: 'Washing Powder 2kg',
        sku: 'NM-CLEAN-002',
        categoryId: cats['Household & Cleaning'],
        brandId: brands['HomeChoice'],
        purchasePrice: 6.50,
        sellingPrice: 9.99,
        stockQty: 33,
        lowStockThreshold: 12,
        storageType: 'AMBIENT' as const,
        unitOfMeasure: 'box',
        description: 'Bio washing powder, effective at 30°C',
      },
      // 20. Dairy & Eggs
      {
        name: 'Eggs Free Range x12',
        sku: 'NM-EGG-001',
        categoryId: cats['Dairy & Eggs'],
        brandId: brands['FreshFarm'],
        purchasePrice: 3.20,
        sellingPrice: 4.99,
        stockQty: 20,
        lowStockThreshold: 8,
        storageType: 'REFRIGERATED' as const,
        isPerishable: true,
        unitOfMeasure: 'dozen',
        description: 'Large free-range eggs, class A, pack of 12',
      },
    ];

    for (const def of productDefs) {
      const p = await prisma.product.upsert({
        where: { sku: def.sku },
        update: {},
        create: { ...baseProduct, ...def },
      });
      products[def.sku] = p.id;
      const stockNote =
        def.stockQty === 0
          ? ' [OUT OF STOCK]'
          : def.stockQty <= def.lowStockThreshold
          ? ` [LOW STOCK: ${def.stockQty}]`
          : '';
      console.log(`  ${def.name} — qty: ${def.stockQty}, price: $${def.sellingPrice}${stockNote}`);
    }
    console.log();
  } catch (e) {
    console.error('FATAL: Products seed failed:', e);
    throw e;
  }

  // ── 7. Product Batches with expiry dates ────────────────────────────────────

  console.log('Creating product batches (some expiring within 7 days)...');

  const batchDefs = [
    // Expiring very soon — triggers alerts
    {
      productId: products['NM-VEG-001'],    // Baby Spinach — 2 days
      batchNumber: 'BATCH-VEG-001',
      expiryDate: addDays(now, 2),
      quantity: 8,
    },
    {
      productId: products['NM-DAIRY-001'],  // Whole Milk — 3 days
      batchNumber: 'BATCH-MLK-001',
      expiryDate: addDays(now, 3),
      quantity: 45,
    },
    {
      productId: products['NM-MEAT-001'],   // Chicken Breast — 4 days
      batchNumber: 'BATCH-CHK-001',
      expiryDate: addDays(now, 4),
      quantity: 28,
    },
    {
      productId: products['NM-DAIRY-003'],  // Cheddar Cheese — 5 days
      batchNumber: 'BATCH-CHD-001',
      expiryDate: addDays(now, 5),
      quantity: 9,
    },
    {
      productId: products['NM-DAIRY-002'],  // Greek Yogurt — 6 days
      batchNumber: 'BATCH-YOG-001',
      expiryDate: addDays(now, 6),
      quantity: 24,
    },
    // Normal batches — longer shelf life
    {
      productId: products['NM-BEV-001'],    // Orange Juice — 14 days
      batchNumber: 'BATCH-OJ-001',
      expiryDate: addDays(now, 14),
      quantity: 31,
    },
    {
      productId: products['NM-BAKE-001'],   // Sourdough Bread — 7 days
      batchNumber: 'BATCH-BRD-001',
      expiryDate: addDays(now, 7),
      quantity: 12,
    },
    {
      productId: products['NM-GRAIN-001'],  // Basmati Rice — 730 days
      batchNumber: 'BATCH-RICE-001',
      expiryDate: addDays(now, 730),
      quantity: 60,
    },
    {
      productId: products['NM-SNACK-001'],  // Dark Chocolate — 180 days
      batchNumber: 'BATCH-CHOC-001',
      expiryDate: addDays(now, 180),
      quantity: 55,
    },
    {
      productId: products['NM-FRZN-001'],   // Frozen Peas — 365 days
      batchNumber: 'BATCH-PEAS-001',
      expiryDate: addDays(now, 365),
      quantity: 38,
    },
  ];

  for (const b of batchDefs) {
    await prisma.productBatch.upsert({ where: { id: b.batchNumber }, update: {}, create: { id: b.batchNumber, ...b } });
    const daysLeft = Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86400000);
    const flag = daysLeft <= 7 ? ` *** EXPIRING IN ${daysLeft} DAYS ***` : '';
    console.log(`  ${b.batchNumber} (qty: ${b.quantity}, expires: ${b.expiryDate.toISOString().split('T')[0]})${flag}`);
  }
  console.log();

  // ── 8. Purchase Order (RECEIVED) ─────────────────────────────────────────────

  console.log('Creating purchase order...');

  await prisma.purchaseOrder.upsert({
    where: { id: `po-${DEMO_STORE_ID}-001` },
    update: {},
    create: {
      id: `po-${DEMO_STORE_ID}-001`,
      storeId: store.id,
      supplierId: suppliers[0], // FreshDirect Wholesale
      status: 'RECEIVED',
      expectedDate: addDays(now, -2),
      notes: 'Weekly dairy and fresh produce restocking order',
      createdBy: ownerUser.id,
      items: {
        create: [
          {
            productId: products['NM-DAIRY-001'], // Whole Milk
            quantity: 50,
            unitPrice: 2.20,
            receivedQty: 50,
          },
          {
            productId: products['NM-EGG-001'], // Free Range Eggs
            quantity: 30,
            unitPrice: 3.20,
            receivedQty: 28,
          },
          {
            productId: products['NM-DAIRY-002'], // Greek Yogurt
            quantity: 24,
            unitPrice: 2.80,
            receivedQty: 24,
          },
        ],
      },
    },
  });
  console.log('  Purchase order created: FreshDirect Wholesale — RECEIVED (3 line items)\n');

  // ── 9. Promotions ────────────────────────────────────────────────────────────

  try {
    await prisma.promotion.createMany({
      data: [
        { storeId: store.id, name: 'Weekend Sale 20% Off', type: 'PERCENTAGE', discountValue: 20, minOrderAmount: 15, appliesTo: 'ALL', startDate: addDays(now, -2), endDate: addDays(now, 5), status: 'ACTIVE', usedCount: 8 },
        { storeId: store.id, name: '$5 Off Orders Over $30', type: 'FIXED', discountValue: 5, minOrderAmount: 30, appliesTo: 'ALL', startDate: addDays(now, -7), endDate: addDays(now, 14), status: 'ACTIVE', usedCount: 3 },
        { storeId: store.id, name: 'Next Week Flash Sale', type: 'PERCENTAGE', discountValue: 15, minOrderAmount: 0, appliesTo: 'ALL', startDate: addDays(now, 3), endDate: addDays(now, 10), status: 'SCHEDULED', usedCount: 0 },
      ],
    });
    console.log('  Created promotions\n');
  } catch (e) {
    console.warn('WARNING: Promotions seed failed (continuing):', e);
  }

  // ── 10. Shifts for the current week ──────────────────────────────────────────

  try {
    console.log('Creating shifts for the current week...');

    const monday = getWeekMonday();

    const shiftSchedule = [
      // Michael Chen — CASHIER — Morning Mon–Fri
      {
        staffId: staffRecords[0].staffId,
        shiftType: 'MORNING' as const,
        startTime: '06:00',
        endTime: '14:00',
        days: [0, 1, 2, 3, 4], // Mon–Fri (offset from Monday)
      },
      // Emma Davis — STOCK — Evening Mon, Tue, Wed, Fri, Sat
      {
        staffId: staffRecords[1].staffId,
        shiftType: 'EVENING' as const,
        startTime: '14:00',
        endTime: '22:00',
        days: [0, 1, 2, 4, 5], // Mon, Tue, Wed, Fri, Sat
      },
      // James Wilson — SUPERVISOR — Full Day Mon, Wed, Fri
      {
        staffId: staffRecords[2].staffId,
        shiftType: 'FULL_DAY' as const,
        startTime: '06:00',
        endTime: '22:00',
        days: [0, 2, 4], // Mon, Wed, Fri
      },
    ];

    let shiftCount = 0;
    for (const schedule of shiftSchedule) {
      for (const dayOffset of schedule.days) {
        const shiftDate = addDays(monday, dayOffset);
        const shiftId = `shift-${schedule.staffId}-${shiftDate.toISOString().split('T')[0]}`;
        await prisma.shift.upsert({
          where: { id: shiftId },
          update: {},
          create: {
            id: shiftId,
            storeId: store.id,
            staffId: schedule.staffId,
            date: shiftDate,
            shiftType: schedule.shiftType,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'SCHEDULED',
            createdBy: ownerUser.id,
          },
        });
        shiftCount++;
      }
    }
    console.log(`  ${shiftCount} shifts created across 3 staff members for this week.\n`);
  } catch (e) {
    console.warn('WARNING: Shifts seed failed (continuing):', e);
  }

  // ── 11. Audit Log entries ────────────────────────────────────────────────────

  console.log('Creating audit log entries...');

  const auditDefs = [
    { userId: ownerUser.id,    action: 'CREATE', module: 'Store',    newValue: { name: store.name } },
    { userId: ownerUser.id,    action: 'CREATE', module: 'Products', newValue: { name: 'Whole Milk 1L', sku: 'NM-DAIRY-001' } },
    { userId: managerUser.id,  action: 'UPDATE', module: 'Inventory', newValue: { productId: products['NM-VEG-001'], stockQty: 8 } },
    { userId: ownerUser.id,    action: 'CREATE', module: 'Suppliers', newValue: { name: 'FreshDirect Wholesale' } },
    { userId: managerUser.id,  action: 'CREATE', module: 'PurchaseOrder', newValue: { status: 'RECEIVED' } },
    { userId: ownerUser.id,    action: 'CREATE', module: 'Staff',    newValue: { name: 'Michael Chen', position: 'CASHIER' } },
  ];

  for (const entry of auditDefs) {
    const auditId = `audit-${entry.userId}-${entry.module}-${entry.action}`;
    await prisma.auditLog.upsert({
      where: { id: auditId },
      update: {},
      create: { id: auditId, storeId: store.id, ipAddress: '127.0.0.1', ...entry },
    });
  }
  console.log(`  ${auditDefs.length} audit log entries created.\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('========================================');
  console.log('  Seed complete!');
  console.log('========================================\n');
  console.log('Demo login credentials (password: password123):\n');
  console.log('  OWNER    → owner@neighbormart.com');
  console.log('  MANAGER  → manager@neighbormart.com');
  console.log('  CASHIER  → staff.cashier@neighbormart.com');
  console.log('  STOCK    → staff.stock@neighbormart.com');
  console.log('  SUPERVISOR → staff.supervisor@neighbormart.com');
  console.log('\nInventory status summary:');
  console.log('  Out of stock : Tomato Soup 400g (0 units)');
  console.log('  Low stock    : Baby Spinach 200g (8/10), Vitamin C 60 tabs (7/10), Cheddar Cheese 200g (9/10)');
  console.log('  Expiring <7d : Baby Spinach (2d), Whole Milk (3d), Chicken Breast (4d), Cheddar Cheese (5d), Greek Yogurt (6d)');
  console.log('');

  // ── Phase 2 Seed Data ───────────────────────────────────────────────────────

  console.log('Creating Phase 2 seed data...');

  // Customer users
  const customerInputs = [
    { name: 'Lisa Park', email: 'customer1@demo.com', phone: '555-0201', tier: 'PLATINUM' as const, loyaltyPoints: 3200, totalSpend: 1850.00, totalOrders: 42 },
    { name: 'David Kim', email: 'customer2@demo.com', phone: '555-0202', tier: 'GOLD' as const, loyaltyPoints: 880, totalSpend: 640.00, totalOrders: 18 },
    { name: 'Maria Rodriguez', email: 'customer3@demo.com', phone: '555-0203', tier: 'SILVER' as const, loyaltyPoints: 210, totalSpend: 145.00, totalOrders: 6 },
    { name: 'Tom Bradley', email: 'customer4@demo.com', phone: '555-0204', tier: 'GOLD' as const, loyaltyPoints: 650, totalSpend: 520.00, totalOrders: 14 },
  ];

  const customerRecords: { userId: string; customerId: string; name: string }[] = [];
  for (const c of customerInputs) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { storeId: store.id, name: c.name, email: c.email, phone: c.phone, password: await bcrypt.hash('password123', 10), role: 'CUSTOMER' },
    });
    const cust = await prisma.customer.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, storeId: store.id, loyaltyPoints: c.loyaltyPoints, tier: c.tier, totalSpend: c.totalSpend, totalOrders: c.totalOrders },
    });
    customerRecords.push({ userId: u.id, customerId: cust.id, name: c.name });
  }
  console.log(`  Created ${customerRecords.length} customers`);

  // Get a product list for orders (we need product IDs from the already-created products)
  const productList = await prisma.product.findMany({ where: { storeId: store.id, stockQty: { gt: 0 } }, select: { id: true, name: true, sellingPrice: true }, take: 8 });

  // Sample orders (last 30 days)
  try {
    const staffUser = await prisma.user.findFirst({ where: { storeId: store.id, role: 'STAFF' } });
    const cashierId = staffUser?.id;

    const orderDates = [-1, -2, -3, -5, -7, -9, -11, -14, -16, -18, -20, -22, -25, -27, -29].map(d => addDays(now, d));
    let orderCount = 0;
    for (let i = 0; i < orderDates.length; i++) {
      const custRecord = customerRecords[i % customerRecords.length];
      const item1 = productList[i % productList.length];
      const item2 = productList[(i + 1) % productList.length];
      const qty1 = (i % 3) + 1;
      const qty2 = (i % 2) + 1;
      const subtotal = item1.sellingPrice * qty1 + item2.sellingPrice * qty2;
      const taxAmount = subtotal * 0.08;
      const total = subtotal + taxAmount;
      const cashTendered = Math.ceil(total / 5) * 5;

      await prisma.order.create({
        data: {
          storeId: store.id,
          customerId: custRecord.customerId,
          cashierId,
          type: i % 3 === 0 ? 'DELIVERY' : 'IN_STORE',
          status: i < 3 ? 'PENDING' : 'DELIVERED',
          subtotal,
          taxAmount,
          total,
          paymentMethod: 'CASH',
          cashTendered,
          changeGiven: cashTendered - total,
          createdAt: orderDates[i],
          updatedAt: orderDates[i],
          items: {
            create: [
              { productId: item1.id, productName: item1.name, quantity: qty1, unitPrice: item1.sellingPrice, subtotal: item1.sellingPrice * qty1 },
              { productId: item2.id, productName: item2.name, quantity: qty2, unitPrice: item2.sellingPrice, subtotal: item2.sellingPrice * qty2 },
            ],
          },
          tracking: { create: { status: i < 3 ? 'PENDING' : 'DELIVERED', note: i < 3 ? 'Order received' : 'Delivered to customer', timestamp: orderDates[i] } },
        },
      });
      orderCount++;
    }
    console.log(`  Created ${orderCount} orders`);
  } catch (e) {
    console.warn('WARNING: Sample orders seed failed (continuing):', e);
  }

  // Coupons
  await prisma.coupon.createMany({
    data: [
      { storeId: store.id, code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrder: 0, usageLimit: 100, usedCount: 22, status: 'ACTIVE' },
      { storeId: store.id, code: 'SAVE5NOW', type: 'FIXED', value: 5, minOrder: 25, usageLimit: 50, usedCount: 11, status: 'ACTIVE' },
      { storeId: store.id, code: 'SUMMER20', type: 'PERCENTAGE', value: 20, minOrder: 40, usageLimit: 30, usedCount: 30, expiryDate: addDays(now, -1), status: 'EXPIRED' },
    ],
  });
  console.log('  Created coupons');

  // Expenses
  const loggedByUserId = ownerUser.id;
  await prisma.expense.createMany({
    data: [
      { storeId: store.id, category: 'Utilities', amount: 320.00, description: 'Monthly electricity bill', loggedBy: loggedByUserId, status: 'APPROVED', date: addDays(now, -5), approvedBy: loggedByUserId },
      { storeId: store.id, category: 'Rent', amount: 2500.00, description: 'Monthly store rent', loggedBy: loggedByUserId, status: 'APPROVED', date: addDays(now, -3), approvedBy: loggedByUserId },
      { storeId: store.id, category: 'Supplies', amount: 85.50, description: 'Cleaning supplies and packaging', loggedBy: loggedByUserId, status: 'PENDING', date: addDays(now, -1) },
      { storeId: store.id, category: 'Marketing', amount: 150.00, description: 'Social media ads', loggedBy: loggedByUserId, status: 'APPROVED', date: addDays(now, -10), approvedBy: loggedByUserId },
      { storeId: store.id, category: 'Utilities', amount: 95.00, description: 'Water bill', loggedBy: loggedByUserId, status: 'APPROVED', date: addDays(now, -8), approvedBy: loggedByUserId },
    ],
  });
  console.log('  Created expenses');

  // Gift Cards
  await prisma.giftCard.createMany({
    data: [
      { storeId: store.id, code: 'GC-DEMO0001', originalValue: 50, currentBalance: 35.50, status: 'ACTIVE', expiryDate: addDays(now, 180) },
      { storeId: store.id, code: 'GC-DEMO0002', originalValue: 25, currentBalance: 0, status: 'USED' },
      { storeId: store.id, code: 'GC-DEMO0003', originalValue: 100, currentBalance: 100, status: 'ACTIVE', expiryDate: addDays(now, 365) },
    ],
  });
  console.log('  Created gift cards');

  // Loyalty transactions for first customer
  const firstCustomer = customerRecords[0];
  await prisma.loyaltyTransaction.createMany({
    data: [
      { customerId: firstCustomer.customerId, storeId: store.id, type: 'EARNED', points: 185, description: 'Purchase reward', createdAt: addDays(now, -7) },
      { customerId: firstCustomer.customerId, storeId: store.id, type: 'EARNED', points: 240, description: 'Purchase reward', createdAt: addDays(now, -14) },
      { customerId: firstCustomer.customerId, storeId: store.id, type: 'REDEEMED', points: -100, description: 'Points redeemed for discount', createdAt: addDays(now, -3) },
      { customerId: firstCustomer.customerId, storeId: store.id, type: 'BONUS', points: 500, description: 'Birthday bonus', createdAt: addDays(now, -1) },
    ],
  });
  console.log('  Created loyalty transactions');

  // Complaints
  await prisma.complaint.upsert({
    where: { id: `complaint-quality-${DEMO_STORE_ID}` },
    update: {},
    create: {
      id: `complaint-quality-${DEMO_STORE_ID}`,
      customerId: customerRecords[1].customerId,
      storeId: store.id,
      type: 'Product Quality',
      description: 'The bread I purchased was stale and the expiry date was tomorrow.',
      status: 'OPEN',
    },
  });
  await prisma.complaint.upsert({
    where: { id: `complaint-delivery-${DEMO_STORE_ID}` },
    update: {},
    create: {
      id: `complaint-delivery-${DEMO_STORE_ID}`,
      customerId: customerRecords[2].customerId,
      storeId: store.id,
      type: 'Delivery Issue',
      description: 'My order arrived 2 hours late and some items were missing.',
      status: 'RESOLVED',
      resolvedBy: ownerUser.id,
      resolutionNote: 'Apologized and issued a $10 coupon for the inconvenience.',
    },
  });
  console.log('  Created complaints');

  // Notifications
  await prisma.notification.createMany({
    data: [
      { storeId: store.id, type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Baby Spinach 200g is running low (8 units remaining)', isRead: false },
      { storeId: store.id, type: 'NEW_ORDER', title: 'New Delivery Order', message: 'Lisa Park placed a new delivery order worth $45.20', isRead: false },
      { storeId: store.id, type: 'COMPLAINT', title: 'New Customer Complaint', message: 'A new complaint was submitted about product quality', isRead: true },
    ],
  });
  console.log('  Created notifications\n');

  console.log('========================================');
  console.log('  Phase 2 seed complete!');
  console.log('========================================\n');
  console.log('Demo customers:');
  for (const c of customerInputs) {
    console.log(`  ${c.tier} | ${c.name} <${c.email}> | ${c.loyaltyPoints} pts`);
  }
  console.log('');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('\nSeed failed with error:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
