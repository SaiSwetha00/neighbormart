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

  // Delete in dependency order (most-derived first)
  await prisma.auditLog.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.wasteLog.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.stockAdjustment.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.attendance.deleteMany({ where: { staff: { storeId: DEMO_STORE_ID } } });
  await prisma.shift.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.leaveRequest.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.goodsReceived.deleteMany({ where: { purchaseOrder: { storeId: DEMO_STORE_ID } } });
  await prisma.purchaseOrder.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.productBatch.deleteMany({ where: { product: { storeId: DEMO_STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.brand.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.supplier.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.manager.deleteMany({ where: { storeId: DEMO_STORE_ID } });
  await prisma.staff.deleteMany({ where: { storeId: DEMO_STORE_ID } });
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

  console.log('Creating store...');
  const store = await prisma.store.create({
    data: {
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

  // ── 2. Password hash ────────────────────────────────────────────────────────

  console.log('Hashing passwords...');
  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('  Done.\n');

  // ── 3. Owner user ───────────────────────────────────────────────────────────

  console.log('Creating users...');
  const ownerUser = await prisma.user.create({
    data: {
      storeId: store.id,
      name: 'Alex Johnson',
      email: 'owner@neighbormart.com',
      password: passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log(`  Owner created: ${ownerUser.name} <${ownerUser.email}>`);

  // ── 4. Manager user + Manager record ────────────────────────────────────────

  const managerUser = await prisma.user.create({
    data: {
      storeId: store.id,
      name: 'Sarah Williams',
      email: 'manager@neighbormart.com',
      password: passwordHash,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  await prisma.manager.create({
    data: {
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

  // ── 5. Staff users + Staff records ──────────────────────────────────────────

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

  const staffRecords: { userId: string; staffId: string; position: string }[] = [];
  for (const input of staffInputs) {
    const staffUser = await prisma.user.create({
      data: {
        storeId: store.id,
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });
    const staffRecord = await prisma.staff.create({
      data: {
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

  // ── 6. 18 Categories ────────────────────────────────────────────────────────

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

  const cats: Record<string, string> = {}; // name → id
  for (const def of categoryDefs) {
    const c = await prisma.category.create({
      data: { storeId: store.id, ...def },
    });
    cats[def.name] = c.id;
    console.log(`  ${def.icon}  ${def.name}`);
  }
  console.log();

  // ── 7. 5 Brands ─────────────────────────────────────────────────────────────

  console.log('Creating brands...');
  const brandNames = ['FreshFarm', 'NatureBest', 'HomeChoice', 'DailyEssentials', 'PureGold'];
  const brands: Record<string, string> = {}; // name → id
  for (const name of brandNames) {
    const b = await prisma.brand.create({ data: { storeId: store.id, name } });
    brands[name] = b.id;
    console.log(`  Brand: ${name}`);
  }
  console.log();

  // ── 8. 3 Suppliers ──────────────────────────────────────────────────────────

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
    const s = await prisma.supplier.create({ data: { storeId: store.id, ...def } });
    suppliers.push(s.id);
    console.log(`  Supplier: ${def.name} (lead time: ${def.leadTimeDays} days, rating: ${def.rating})`);
  }
  console.log();

  // ── 9. 20 Products ──────────────────────────────────────────────────────────

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

  const products: Record<string, string> = {}; // sku → id
  for (const def of productDefs) {
    const p = await prisma.product.create({
      data: { ...baseProduct, ...def },
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

  // ── 10. Product Batches with expiry dates ────────────────────────────────────

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
    await prisma.productBatch.create({ data: b });
    const daysLeft = Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86400000);
    const flag = daysLeft <= 7 ? ` *** EXPIRING IN ${daysLeft} DAYS ***` : '';
    console.log(`  ${b.batchNumber} (qty: ${b.quantity}, expires: ${b.expiryDate.toISOString().split('T')[0]})${flag}`);
  }
  console.log();

  // ── 11. Purchase Order (RECEIVED) ────────────────────────────────────────────

  console.log('Creating purchase order...');

  await prisma.purchaseOrder.create({
    data: {
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

  // ── 12. Shifts for the current week ─────────────────────────────────────────

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
      await prisma.shift.create({
        data: {
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

  // ── 13. Audit Log entries ────────────────────────────────────────────────────

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
    await prisma.auditLog.create({
      data: { storeId: store.id, ipAddress: '127.0.0.1', ...entry },
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
