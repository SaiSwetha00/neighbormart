import prisma from '../../config/database';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePOInput,
  UpdatePOInput,
  ReceiveGoodsInput,
  LogPaymentInput,
} from './suppliers.schema';

function buildPagination(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers(storeId: string, query: { page?: string; limit?: string; search?: string }) {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
  const { skip, take } = buildPagination(page, limit);

  const where: Record<string, unknown> = { storeId };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { contactPerson: { contains: query.search } },
      { email: { contains: query.search } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  const data = suppliers.map((s) => ({ ...s, activePOCount: s._count.purchaseOrders, _count: undefined }));
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createSupplier(storeId: string, data: CreateSupplierInput) {
  return prisma.supplier.create({ data: { ...data, storeId } });
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      },
      payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
    },
  });
  if (!supplier) throw new Error('Supplier not found');

  const totalPaid = supplier.payments.reduce((s, p) => s + p.amount, 0);
  const totalOrdered = supplier.purchaseOrders.reduce(
    (s, po) => s + po.items.reduce((is, item) => is + item.quantity * item.unitPrice, 0), 0
  );

  return { ...supplier, paymentSummary: { totalPaid, totalOrdered, balance: totalOrdered - totalPaid } };
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  const exists = await prisma.supplier.findUnique({ where: { id } });
  if (!exists) throw new Error('Supplier not found');
  return prisma.supplier.update({ where: { id }, data });
}

export async function deleteSupplier(id: string) {
  const exists = await prisma.supplier.findUnique({ where: { id } });
  if (!exists) throw new Error('Supplier not found');
  return prisma.supplier.delete({ where: { id } });
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders(storeId: string, query: { page?: string; limit?: string; status?: string; supplierId?: string }) {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
  const { skip, take } = buildPagination(page, limit);

  const where: Record<string, unknown> = { storeId };
  if (query.status) where.status = query.status;
  if (query.supplierId) where.supplierId = query.supplierId;

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true, contactPerson: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  const data = orders.map((po) => ({
    ...po,
    totalAmount: po.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
  }));

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createPurchaseOrder(storeId: string, data: CreatePOInput, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, storeId } });
  if (!supplier) throw new Error('Supplier not found in this store');

  return prisma.purchaseOrder.create({
    data: {
      storeId,
      supplierId: data.supplierId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes,
      createdBy: userId,
      status: 'DRAFT',
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });
}

export async function getPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
      },
      goodsReceived: {
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!po) throw new Error('Purchase order not found');
  return { ...po, totalAmount: po.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) };
}

export async function updatePurchaseOrder(id: string, data: UpdatePOInput) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    throw new Error('Cannot update a completed or cancelled purchase order');
  }

  const { items, ...poData } = data;

  return prisma.$transaction(async (tx) => {
    if (items) {
      await tx.pOItem.deleteMany({ where: { poId: id } });
      await tx.pOItem.createMany({
        data: items.map((item) => ({
          poId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
    return tx.purchaseOrder.update({
      where: { id },
      data: { ...poData, expectedDate: poData.expectedDate ? new Date(poData.expectedDate) : undefined },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  });
}

export async function updatePOStatus(id: string, status: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error('Purchase order not found');
  return prisma.purchaseOrder.update({ where: { id }, data: { status } });
}

// ── Receive Goods (GRN) ───────────────────────────────────────────────────────

export async function receiveGoods(poId: string, data: ReceiveGoodsInput, userId: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'CANCELLED') throw new Error('Cannot receive goods for a cancelled PO');

  return prisma.$transaction(async (tx) => {
    const grn = await tx.goodsReceived.create({
      data: {
        poId,
        storeId: po.storeId,
        supplierId: po.supplierId,
        receivedBy: userId,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            orderedQty: item.orderedQty,
            receivedQty: item.receivedQty,
            discrepancy: item.orderedQty - item.receivedQty,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      if (item.receivedQty > 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.receivedQty } },
        });

        if (item.batchNumber || item.expiryDate) {
          await tx.productBatch.create({
            data: {
              productId: item.productId,
              batchNumber: item.batchNumber ?? `GRN-${grn.id.slice(0, 8)}`,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              quantity: item.receivedQty,
              supplierId: po.supplierId,
            },
          });
        }

        await tx.pOItem.updateMany({
          where: { poId, productId: item.productId },
          data: { receivedQty: { increment: item.receivedQty } },
        });
      }
    }

    const allFull = data.items.every((i) => i.receivedQty >= i.orderedQty);
    const anyReceived = data.items.some((i) => i.receivedQty > 0);
    const newStatus = allFull ? 'RECEIVED' : anyReceived ? 'PARTIAL' : po.status;

    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: newStatus } });
    return grn;
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getSupplierPayments(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error('Supplier not found');

  const payments = await prisma.supplierPayment.findMany({
    where: { supplierId },
    orderBy: { paymentDate: 'desc' },
  });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  return { payments, totalPaid };
}

export async function logPayment(supplierId: string, storeId: string, data: LogPaymentInput, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, storeId } });
  if (!supplier) throw new Error('Supplier not found in this store');

  return prisma.supplierPayment.create({
    data: {
      supplierId,
      storeId,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      paidBy: userId,
    },
  });
}

// ── Performance ───────────────────────────────────────────────────────────────

export async function getSupplierPerformance(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error('Supplier not found');

  const orders = await prisma.purchaseOrder.findMany({
    where: { supplierId, status: { in: ['RECEIVED', 'PARTIAL'] } },
    include: { goodsReceived: { include: { items: true } }, items: true },
  });

  const totalOrders = orders.length;
  const ordersWithExpected = orders.filter((o) => o.expectedDate !== null);
  const onTimeCount = ordersWithExpected.filter((o) => {
    if (!o.expectedDate || o.goodsReceived.length === 0) return false;
    return o.goodsReceived[0].createdAt <= o.expectedDate;
  }).length;

  const onTimeDeliveryPct = ordersWithExpected.length > 0
    ? Math.round((onTimeCount / ordersWithExpected.length) * 100)
    : null;

  const leadTimes = orders
    .filter((o) => o.goodsReceived.length > 0)
    .map((o) => Math.round((o.goodsReceived[0].createdAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

  const avgLeadTimeDays = leadTimes.length > 0
    ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
    : null;

  let totalItems = 0;
  let discrepancyItems = 0;
  for (const order of orders) {
    for (const grn of order.goodsReceived) {
      for (const item of grn.items) {
        totalItems++;
        if (item.receivedQty < item.orderedQty) discrepancyItems++;
      }
    }
  }

  const discrepancyRate = totalItems > 0 ? Math.round((discrepancyItems / totalItems) * 100) : 0;
  const totalSpend = orders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity * i.unitPrice, 0), 0);

  return { supplierId, supplierName: supplier.name, totalOrders, onTimeDeliveryPct, avgLeadTimeDays, discrepancyRate, totalSpend };
}
