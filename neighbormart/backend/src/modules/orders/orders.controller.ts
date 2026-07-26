import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError, getPagination } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function applyPromotions(storeId: string, items: any[], couponCode?: string) {
  let discountAmount = 0;
  const promoIds: string[] = [];

  // Active promotions
  const promos = await prisma.promotion.findMany({
    where: { storeId, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
  });
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

  for (const promo of promos) {
    if (subtotal < promo.minOrderAmount) continue;
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) continue;
    let disc = 0;
    if (promo.type === 'PERCENTAGE') disc = subtotal * promo.discountValue / 100;
    else if (promo.type === 'FIXED') disc = promo.discountValue;
    discountAmount += disc;
    promoIds.push(promo.id);
  }

  // Coupon
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { storeId, code: couponCode, status: 'ACTIVE', OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
    });
    if (coupon) {
      let disc = 0;
      if (coupon.type === 'PERCENTAGE') disc = subtotal * coupon.value / 100;
      else if (coupon.type === 'FIXED') disc = coupon.value;
      discountAmount += disc;
      await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }
  }

  return { discountAmount, promoIds };
}

// ─── Customer-Facing Orders ───────────────────────────────────────────────────

export const customerOrderController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const orders = await prisma.order.findMany({
        where: { customerId: customer.id },
        include: { items: true, tracking: { orderBy: { timestamp: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { orders });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async get(req: AuthRequest, res: Response) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: { include: { product: { select: { name: true, images: { take: 1 } } } } }, tracking: { orderBy: { timestamp: 'asc' } }, deliveryAddress: true },
      });
      if (!order) return sendError(res, 'Order not found', 404);
      return sendSuccess(res, order);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async place(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const { type, items, deliveryAddressId, deliverySlot, specialInstructions, couponCode, loyaltyPointsUsed = 0 } = req.body;

      // Build order items with current prices
      const productIds = items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      const orderItems = items.map((i: any) => {
        const p = products.find((pr) => pr.id === i.productId);
        if (!p) throw new Error(`Product ${i.productId} not found`);
        const unitPrice = p.sellingPrice;
        const subtotal = unitPrice * i.quantity;
        return { productId: i.productId, productName: p.name, quantity: i.quantity, unitPrice, subtotal, discount: 0 };
      });

      const subtotal = orderItems.reduce((s: number, i: any) => s + i.subtotal, 0);
      const { discountAmount, promoIds } = await applyPromotions(customer.storeId, orderItems, couponCode);

      // Loyalty points (1 point = $0.01)
      const loyaltyDiscount = Math.min(loyaltyPointsUsed * 0.01, subtotal - discountAmount);
      const taxAmount = subtotal * 0.08;
      const total = Math.max(0, subtotal - discountAmount - loyaltyDiscount + taxAmount);

      const order = await prisma.order.create({
        data: {
          storeId: customer.storeId,
          customerId: customer.id,
          type: type ?? 'DELIVERY',
          status: 'PENDING',
          subtotal,
          taxAmount,
          discountAmount: discountAmount + loyaltyDiscount,
          loyaltyPointsUsed,
          total,
          paymentMethod: 'CASH',
          deliveryAddressId,
          deliverySlot,
          specialInstructions,
          couponCode,
          promotionIds: promoIds,
          items: { create: orderItems },
          tracking: { create: { status: 'PENDING', note: 'Order placed' } },
        },
        include: { items: true, tracking: true },
      });

      // Deduct loyalty points, award new ones
      const pointsEarned = Math.floor(total);
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: { increment: pointsEarned - loyaltyPointsUsed },
          totalSpend: { increment: total },
          totalOrders: { increment: 1 },
        },
      });
      if (pointsEarned > 0) {
        await prisma.loyaltyTransaction.create({
          data: { customerId: customer.id, storeId: customer.storeId, type: 'EARNED', points: pointsEarned, reference: order.id, description: 'Order purchase' },
        });
      }
      if (loyaltyPointsUsed > 0) {
        await prisma.loyaltyTransaction.create({
          data: { customerId: customer.id, storeId: customer.storeId, type: 'REDEEMED', points: -loyaltyPointsUsed, reference: order.id, description: 'Points redeemed' },
        });
      }

      // Decrement stock
      for (const item of orderItems) {
        await prisma.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.quantity } } });
      }

      // Auto-create Delivery record for DELIVERY type orders
      if (order.type === 'DELIVERY') {
        const savedAddr = deliveryAddressId
          ? await prisma.savedAddress.findUnique({ where: { id: deliveryAddressId } })
          : null;
        await prisma.delivery.create({
          data: {
            orderId: order.id,
            storeId: customer.storeId,
            status: 'PENDING',
            deliveryFee: 0,
            addressText: savedAddr ? `${savedAddr.fullAddress}, ${savedAddr.city || ''}`.trim() : undefined,
            addressLat: savedAddr?.lat ?? undefined,
            addressLng: savedAddr?.lng ?? undefined,
          },
        });
      }

      // Update promotion usage
      for (const promoId of promoIds) {
        await prisma.promotion.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
      }

      return sendSuccess(res, order, 'Order placed', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async cancel(req: AuthRequest, res: Response) {
    try {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order) return sendError(res, 'Order not found', 404);
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) return sendError(res, 'Order cannot be cancelled', 400);
      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED', tracking: { create: { status: 'CANCELLED', note: 'Cancelled by customer' } } },
      });
      return sendSuccess(res, updated, 'Order cancelled');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Staff/Owner Order Management ─────────────────────────────────────────────

export const orderController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status, type, search, dateFrom, dateTo } = req.query;
      const p = Number(page), l = Number(limit);
      const where: any = { storeId: req.user!.storeId };
      if (status) where.status = status;
      if (type) where.type = type;
      if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: new Date(String(dateFrom)) }), ...(dateTo && { lte: new Date(String(dateTo)) }) };
      if (search) where.id = { contains: String(search) };

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: {
            customer: { include: { user: { select: { name: true, email: true } } } },
            cashier: { select: { name: true } },
            items: true,
          },
          skip: (p - 1) * l,
          take: l,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return sendSuccess(res, { orders }, 'Orders retrieved', 200, getPagination(p, l, total));
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async get(req: AuthRequest, res: Response) {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.id, storeId: req.user!.storeId },
        include: {
          customer: { include: { user: { select: { name: true, email: true, phone: true } } } },
          cashier: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          tracking: { orderBy: { timestamp: 'asc' } },
          deliveryAddress: true,
          returns: { include: { items: true } },
        },
      });
      if (!order) return sendError(res, 'Order not found', 404);
      return sendSuccess(res, order);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status, note } = req.body;
      const validStatuses = ['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
      if (!status) return sendError(res, 'Status is required', 400);
      if (!validStatuses.includes(status)) return sendError(res, `Status must be one of: ${validStatuses.join(', ')}`, 400);
      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: { status, tracking: { create: { status, note, updatedBy: req.user!.userId } } },
        include: { tracking: { orderBy: { timestamp: 'desc' }, take: 1 } },
      });
      return sendSuccess(res, order, 'Status updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async processReturn(req: AuthRequest, res: Response) {
    try {
      const { items, reason } = req.body;
      const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!order) return sendError(res, 'Order not found', 404);

      let refundAmount = 0;
      const returnItems = items.map((ri: any) => {
        const oi = order.items.find((i) => i.id === ri.orderItemId);
        if (!oi) throw new Error(`Order item not found: ${ri.orderItemId}`);
        refundAmount += oi.unitPrice * ri.quantity;
        return { orderItemId: ri.orderItemId, quantity: ri.quantity, reason: ri.reason };
      });

      const ret = await prisma.return.create({
        data: {
          orderId: order.id,
          storeId: req.user!.storeId,
          customerId: order.customerId,
          refundAmount,
          reason,
          processedBy: req.user!.userId,
          status: 'APPROVED',
          items: { create: returnItems },
        },
        include: { items: true },
      });

      // Restock
      for (const ri of items) {
        const oi = order.items.find((i) => i.id === ri.orderItemId);
        if (oi?.productId) {
          await prisma.product.update({ where: { id: oi.productId }, data: { stockQty: { increment: ri.quantity } } });
        }
      }

      return sendSuccess(res, ret, 'Return processed', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
