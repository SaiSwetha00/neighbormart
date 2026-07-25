import prisma from '../../config/database';

// ── Owner Dashboard ──────────────────────────────────────────────────────────

export async function getOwnerDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    store,
    allProducts,
    todayAttendance,
    wasteAggregate,
    recentAuditLogs,
    expiringBatches,
    pendingLeaveCount,
  ] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId }, select: { salesGoal: true, currency: true } }),

    prisma.product.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQty: true,
        lowStockThreshold: true,
        sellingPrice: true,
        purchasePrice: true,
        status: true,
      },
    }),

    prisma.attendance.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        staff: { storeId },
      },
      include: {
        staff: {
          include: {
            user: { select: { name: true, photo: true } },
          },
        },
      },
    }),

    prisma.wasteLog.aggregate({
      where: { storeId, createdAt: { gte: today, lt: tomorrow } },
      _sum: { financialValue: true },
    }),

    prisma.auditLog.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, photo: true } },
      },
    }),

    prisma.productBatch.findMany({
      where: {
        product: { storeId },
        expiryDate: { gte: today, lte: sevenDaysFromNow },
        quantity: { gt: 0 },
      },
      include: { product: { select: { name: true } } },
      take: 10,
      orderBy: { expiryDate: 'asc' },
    }),

    prisma.leaveRequest.count({
      where: { staff: { storeId }, status: 'PENDING' },
    }),
  ]);

  const activeProducts = allProducts.filter((p) => p.status === 'ACTIVE');
  const inStock = activeProducts.filter((p) => p.stockQty > p.lowStockThreshold).length;
  const lowStock = activeProducts.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).length;
  const outOfStock = activeProducts.filter((p) => p.stockQty <= 0).length;
  const total = activeProducts.length || 1;

  const inventoryHealth = {
    inStock,
    lowStock,
    outOfStock,
    inStockPct: Math.round((inStock / total) * 100),
    lowStockPct: Math.round((lowStock / total) * 100),
    outOfStockPct: Math.round((outOfStock / total) * 100),
  };

  const stockValue = activeProducts.reduce((s, p) => s + p.stockQty * p.purchasePrice, 0);

  const lowStockItems = activeProducts
    .filter((p) => p.stockQty <= p.lowStockThreshold)
    .sort((a, b) => a.stockQty - b.stockQty)
    .slice(0, 10);

  // Staff clocked in now = attendance records for today with no clockOut
  const staffOnlineNow = todayAttendance.filter((a) => a.clockIn && !a.clockOut).length;
  const staffOnlineList = todayAttendance
    .filter((a) => a.clockIn && !a.clockOut)
    .map((a) => ({
      staffId: a.staffId,
      name: a.staff.user.name,
      photo: a.staff.user.photo ?? null,
      position: a.staff.position,
      clockIn: a.clockIn,
    }));

  // Revenue chart — last 7 days placeholder (Phase 2 adds sales module)
  const revenueChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().split('T')[0], revenue: 0, orders: 0 };
  });

  const recentActivity = recentAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    module: log.module,
    recordId: log.recordId ?? null,
    createdAt: log.createdAt,
    user: { name: log.user?.name ?? 'System', photo: log.user?.photo ?? null },
  }));

  const criticalAlerts = activeProducts
    .filter((p) => p.stockQty <= 0)
    .slice(0, 5)
    .map((p) => ({ type: 'out_of_stock', productId: p.id, productName: p.name, stockQty: p.stockQty }));

  const warningAlerts = [
    ...activeProducts
      .filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold)
      .slice(0, 8)
      .map((p) => ({ type: 'low_stock', productId: p.id, productName: p.name, stockQty: p.stockQty, threshold: p.lowStockThreshold })),
    ...expiringBatches.map((b) => ({ type: 'expiring_soon', productName: b.product.name, expiryDate: b.expiryDate, quantity: b.quantity })),
  ].slice(0, 10);

  return {
    revenueToday: 0,
    ordersToday: 0,
    totalProducts: activeProducts.length,
    staffOnlineNow,
    lowStockCount: lowStock,
    outOfStockCount: outOfStock,
    wasteToday: wasteAggregate._sum.financialValue ?? 0,
    stockValue,
    pendingLeaveRequests: pendingLeaveCount,
    revenueChart,
    inventoryHealth,
    lowStockItems,
    staffOnlineList,
    expiringThisWeek: expiringBatches.length,
    salesGoalProgress: { goal: store?.salesGoal ?? 0, current: 0, percentage: 0 },
    recentActivity,
    alerts: { critical: criticalAlerts, warning: warningAlerts, info: [] },
  };
}

// ── Manager Dashboard ────────────────────────────────────────────────────────

export async function getManagerDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [lowStockProducts, expiringBatches, todayAttendance, pendingLeaveCount, totalStaff] = await Promise.all([
    prisma.product.findMany({
      where: { storeId, status: 'ACTIVE', stockQty: { lte: 10 } },
      orderBy: { stockQty: 'asc' },
      take: 10,
      select: { id: true, name: true, sku: true, stockQty: true, lowStockThreshold: true, unitOfMeasure: true },
    }),

    prisma.productBatch.findMany({
      where: {
        product: { storeId },
        expiryDate: { gte: today, lte: sevenDaysFromNow },
        quantity: { gt: 0 },
      },
      include: { product: { select: { name: true, unitOfMeasure: true } } },
      orderBy: { expiryDate: 'asc' },
    }),

    prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, staff: { storeId } },
      include: {
        staff: { include: { user: { select: { name: true, photo: true } } } },
      },
    }),

    prisma.leaveRequest.count({ where: { staff: { storeId }, status: 'PENDING' } }),
    prisma.staff.count({ where: { storeId, status: 'ACTIVE' } }),
  ]);

  const onShiftNow = todayAttendance.filter((a) => a.clockIn && !a.clockOut);

  return {
    revenueToday: 0,
    totalStaff,
    presentToday: todayAttendance.length,
    onShiftNow: onShiftNow.length,
    pendingLeaveRequests: pendingLeaveCount,
    lowStockItems: lowStockProducts,
    expiringThisWeek: expiringBatches,
    staffOnShift: onShiftNow.map((a) => ({
      staffId: a.staffId,
      name: a.staff.user.name,
      photo: a.staff.user.photo ?? null,
      position: a.staff.position,
      clockIn: a.clockIn,
    })),
  };
}

// ── Staff Dashboard ──────────────────────────────────────────────────────────

export async function getStaffDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAttendance, pendingLeave, totalStaff, upcomingShifts] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, staff: { storeId } },
      include: {
        staff: { include: { user: { select: { name: true, photo: true } } } },
      },
    }),
    prisma.leaveRequest.count({ where: { staff: { storeId }, status: 'PENDING' } }),
    prisma.staff.count({ where: { storeId, status: 'ACTIVE' } }),
    prisma.shift.findMany({
      where: { storeId, date: { gte: today }, status: 'SCHEDULED' },
      orderBy: { date: 'asc' },
      take: 20,
      include: {
        staff: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const onShiftNow = todayAttendance.filter((a) => a.clockIn && !a.clockOut);
  const presentToday = todayAttendance.length;
  const absentToday = Math.max(0, totalStaff - presentToday);

  return {
    totalStaff,
    presentToday,
    onShiftNow: onShiftNow.length,
    absentToday,
    attendanceRate: totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0,
    pendingLeaveRequests: pendingLeave,
    onShiftList: onShiftNow.map((a) => ({
      staffId: a.staffId,
      name: a.staff.user.name,
      photo: a.staff.user.photo ?? null,
      position: a.staff.position,
      clockIn: a.clockIn,
    })),
    upcomingShifts: upcomingShifts.map((s) => ({
      id: s.id,
      staffName: s.staff.user.name,
      date: s.date,
      shiftType: s.shiftType,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  };
}

// ── Supplier Dashboard ───────────────────────────────────────────────────────

export async function getSupplierDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [pendingPOs, supplierCount, recentPOs] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { storeId, status: { in: ['DRAFT', 'SENT'] } },
      include: { supplier: { select: { name: true } }, items: { select: { quantity: true, unitPrice: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count({ where: { storeId } }),
    prisma.purchaseOrder.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { supplier: { select: { name: true } }, items: { select: { quantity: true, unitPrice: true } } },
    }),
  ]);

  const pendingTotal = pendingPOs.reduce((s, po) => s + po.items.reduce((is, i) => is + i.quantity * i.unitPrice, 0), 0);

  return {
    pendingPOsCount: pendingPOs.length,
    pendingPOsValue: pendingTotal,
    activeSuppliers: supplierCount,
    pendingPOs: pendingPOs.map((po) => ({
      id: po.id,
      supplier: po.supplier.name,
      totalAmount: po.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      status: po.status,
      createdAt: po.createdAt,
      expectedDate: po.expectedDate,
    })),
    recentOrders: recentPOs.map((po) => ({
      id: po.id,
      supplier: po.supplier.name,
      status: po.status,
      totalAmount: po.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      createdAt: po.createdAt,
    })),
  };
}

// ── Inventory Dashboard ──────────────────────────────────────────────────────

export async function getInventoryDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [products, expiringWeekCount, expiringMonthCount, recentWaste] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      include: { category: { select: { name: true } } },
    }),

    prisma.productBatch.count({
      where: { product: { storeId }, expiryDate: { gte: today, lte: sevenDaysFromNow }, quantity: { gt: 0 } },
    }),

    prisma.productBatch.count({
      where: { product: { storeId }, expiryDate: { gte: today, lte: thirtyDaysFromNow }, quantity: { gt: 0 } },
    }),

    prisma.wasteLog.findMany({
      where: { storeId, createdAt: { gte: startOfMonth } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const inStock = products.filter((p) => p.stockQty > p.lowStockThreshold).length;
  const lowStock = products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).length;
  const outOfStock = products.filter((p) => p.stockQty <= 0).length;
  const stockValue = products.reduce((s, p) => s + p.stockQty * p.purchasePrice, 0);
  const wasteThisMonth = recentWaste.reduce((s, w) => s + (w.financialValue ?? 0), 0);

  const categoryMap = new Map<string, { totalQty: number; value: number }>();
  for (const p of products) {
    const cat = p.category?.name ?? 'Uncategorized';
    const ex = categoryMap.get(cat) ?? { totalQty: 0, value: 0 };
    ex.totalQty += p.stockQty;
    ex.value += p.stockQty * p.purchasePrice;
    categoryMap.set(cat, ex);
  }

  return {
    summary: { totalProducts: products.length, inStock, lowStock, outOfStock, stockValue, wasteThisMonth },
    expiryAlerts: { expiringThisWeek: expiringWeekCount, expiringThisMonth: expiringMonthCount },
    categoryStockChart: Array.from(categoryMap.entries()).map(([category, d]) => ({ category, ...d })),
    criticalItems: products.filter((p) => p.stockQty <= 0).slice(0, 10),
    lowStockItems: products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).sort((a, b) => a.stockQty - b.stockQty).slice(0, 10),
    recentWaste: recentWaste.map((w) => ({
      id: w.id,
      product: w.product.name,
      quantity: w.quantity,
      reason: w.reason,
      financialValue: w.financialValue,
      loggedBy: w.user.name,
      loggedAt: w.createdAt,
    })),
  };
}
