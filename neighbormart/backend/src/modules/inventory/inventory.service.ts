import prisma from '../../config/database';
import type { AdjustStockInput, LogWasteInput, AddBatchInput, CompleteAuditInput } from './inventory.schema';

// ── Overview ──────────────────────────────────────────────────────────────────

export async function getInventoryOverview(storeId: string) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [products, wasteLogs] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      include: {
        category: { select: { name: true } },
        batches: { where: { expiryDate: { lte: weekFromNow, gte: now }, quantity: { gt: 0 } } },
      },
    }),
    prisma.wasteLog.findMany({ where: { storeId, createdAt: { gte: startOfMonth } } }),
  ]);

  const totalSKUs = products.length;
  const stockValue = products.reduce((sum, p) => sum + p.stockQty * p.purchasePrice, 0);
  const lowStockCount = products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stockQty === 0).length;
  const inStockCount = products.filter((p) => p.stockQty > p.lowStockThreshold).length;
  const expiringThisWeek = products.reduce((sum, p) => sum + p.batches.length, 0);
  const wasteThisMonth = wasteLogs.reduce((sum, w) => sum + (w.financialValue ?? 0), 0);

  const categoryMap = new Map<string, { totalQty: number; value: number }>();
  for (const p of products) {
    const cat = p.category?.name ?? 'Uncategorized';
    const ex = categoryMap.get(cat) ?? { totalQty: 0, value: 0 };
    ex.totalQty += p.stockQty;
    ex.value += p.stockQty * p.purchasePrice;
    categoryMap.set(cat, ex);
  }

  return {
    totalSKUs,
    stockValue,
    lowStockCount,
    outOfStockCount,
    inStockCount,
    expiringThisWeek,
    wasteThisMonth,
    inStockPct: Math.round((inStockCount / (totalSKUs || 1)) * 100),
    lowStockPct: Math.round((lowStockCount / (totalSKUs || 1)) * 100),
    outOfStockPct: Math.round((outOfStockCount / (totalSKUs || 1)) * 100),
    categoryStockChart: Array.from(categoryMap.entries()).map(([category, d]) => ({ category, ...d })),
  };
}

// ── Low Stock / Out of Stock ──────────────────────────────────────────────────

export async function getLowStock(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    include: { category: { select: { name: true } } },
    orderBy: { stockQty: 'asc' },
  });
  return products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold);
}

export async function getOutOfStock(storeId: string) {
  return prisma.product.findMany({
    where: { storeId, stockQty: 0 },
    include: { category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getExpiring(storeId: string, days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.productBatch.findMany({
    where: {
      product: { storeId },
      expiryDate: { gte: now, lte: future },
      quantity: { gt: 0 },
    },
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { expiryDate: 'asc' },
  });
}

// ── Valuation ─────────────────────────────────────────────────────────────────

export async function getValuation(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, sku: true, stockQty: true, purchasePrice: true, sellingPrice: true },
  });

  const totalCostValue = products.reduce((s, p) => s + p.stockQty * p.purchasePrice, 0);
  const totalRetailValue = products.reduce((s, p) => s + p.stockQty * p.sellingPrice, 0);
  const potentialProfit = totalRetailValue - totalCostValue;

  return { totalCostValue, totalRetailValue, potentialProfit, productCount: products.length, products };
}

// ── Stock Adjustments ─────────────────────────────────────────────────────────

export async function adjustStock(storeId: string, data: AdjustStockInput, userId: string) {
  const product = await prisma.product.findFirst({ where: { id: data.productId, storeId } });
  if (!product) throw new Error('Product not found in this store');

  const newQty =
    data.type === 'ADD'
      ? product.stockQty + data.quantity
      : Math.max(0, product.stockQty - data.quantity);

  const [adjustment] = await prisma.$transaction([
    prisma.stockAdjustment.create({
      data: { productId: data.productId, storeId, type: data.type, quantity: data.quantity, reason: data.reason, adjustedBy: userId },
    }),
    prisma.product.update({ where: { id: data.productId }, data: { stockQty: newQty } }),
  ]);

  return { ...adjustment, newStockQty: newQty };
}

export async function getAdjustments(storeId: string, productId?: string) {
  return prisma.stockAdjustment.findMany({
    where: { storeId, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
  });
}

// ── Waste Log ─────────────────────────────────────────────────────────────────

export async function logWaste(storeId: string, data: LogWasteInput, userId: string) {
  const product = await prisma.product.findFirst({ where: { id: data.productId, storeId } });
  if (!product) throw new Error('Product not found in this store');

  const [wasteLog] = await prisma.$transaction([
    prisma.wasteLog.create({
      data: { productId: data.productId, storeId, quantity: data.quantity, reason: data.reason, financialValue: data.financialValue, loggedBy: userId },
    }),
    prisma.product.update({ where: { id: data.productId }, data: { stockQty: { decrement: data.quantity } } }),
  ]);

  return wasteLog;
}

export async function getWasteLogs(storeId: string) {
  return prisma.wasteLog.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
  });
}

// ── Batches ───────────────────────────────────────────────────────────────────

export async function getBatches(productId: string) {
  return prisma.productBatch.findMany({
    where: { productId },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function addBatch(data: AddBatchInput) {
  return prisma.productBatch.create({
    data: {
      productId: data.productId,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      quantity: data.quantity,
    },
  });
}

// ── Daily Audit ───────────────────────────────────────────────────────────────

export async function getTodayAudit(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let audit = await prisma.dailyAudit.findFirst({
    where: { storeId, date: { gte: today, lt: tomorrow } },
  });

  if (!audit) {
    audit = await prisma.dailyAudit.create({
      data: { storeId, status: 'PENDING' },
    });
  }

  return audit;
}

export async function completeAudit(storeId: string, data: CompleteAuditInput, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const audit = await prisma.dailyAudit.findFirst({
    where: { storeId, date: { gte: today, lt: tomorrow } },
  });
  if (!audit) throw new Error('No audit found for today');

  return prisma.dailyAudit.update({
    where: { id: audit.id },
    data: { status: 'COMPLETED', completedBy: userId, discrepancies: data.discrepancies ?? null },
  });
}

export async function getAuditHistory(storeId: string) {
  return prisma.dailyAudit.findMany({
    where: { storeId },
    orderBy: { date: 'desc' },
    take: 30,
  });
}

// ── Shrinkage Report ──────────────────────────────────────────────────────────

export async function getShrinkageReport(storeId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [wasteLogs, adjustments] = await Promise.all([
    prisma.wasteLog.findMany({
      where: { storeId, createdAt: { gte: startOfMonth } },
      include: { product: { select: { name: true, sku: true } } },
    }),
    prisma.stockAdjustment.findMany({
      where: { storeId, type: 'REMOVE', createdAt: { gte: startOfMonth } },
      include: { product: { select: { name: true, sku: true } } },
    }),
  ]);

  const totalWasteValue = wasteLogs.reduce((s, w) => s + (w.financialValue ?? 0), 0);
  const wasteByReason: Record<string, number> = {};
  for (const w of wasteLogs) {
    wasteByReason[w.reason] = (wasteByReason[w.reason] ?? 0) + (w.financialValue ?? 0);
  }

  return { totalWasteValue, wasteByReason, wasteLogs, adjustments };
}
