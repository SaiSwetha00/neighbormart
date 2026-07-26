import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const posController = {
  // ─── POS Sessions (Cash Drawer) ────────────────────────────────────────────

  async openSession(req: AuthRequest, res: Response) {
    try {
      const { openingBalance = 0 } = req.body;
      const existing = await prisma.pOSSession.findFirst({
        where: { cashierId: req.user!.userId, status: 'OPEN' },
      });
      if (existing) return sendSuccess(res, existing, 'Session already open');

      const session = await prisma.pOSSession.create({
        data: {
          storeId: req.user!.storeId,
          cashierId: req.user!.userId,
          openingBalance: Number(openingBalance),
        },
      });
      return sendSuccess(res, session, 'POS session opened', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getActiveSession(req: AuthRequest, res: Response) {
    try {
      const session = await prisma.pOSSession.findFirst({
        where: { cashierId: req.user!.userId, status: 'OPEN' },
        include: { cashier: { select: { name: true } } },
      });
      return sendSuccess(res, session ?? null);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async closeSession(req: AuthRequest, res: Response) {
    try {
      const { closingBalance, notes } = req.body;
      const session = await prisma.pOSSession.findFirst({
        where: { id: req.params.id, cashierId: req.user!.userId, status: 'OPEN' },
      });
      if (!session) return sendError(res, 'No open session found', 404);

      // Calculate expected balance from orders in this session
      const sessionOrders = await prisma.order.findMany({
        where: {
          storeId: req.user!.storeId,
          cashierId: req.user!.userId,
          createdAt: { gte: session.openedAt },
          type: 'IN_STORE',
          status: { notIn: ['CANCELLED'] },
        },
        select: { total: true },
      });
      const cashFromOrders = sessionOrders.reduce((s, o) => s + o.total, 0);
      const expectedBalance = session.openingBalance + cashFromOrders;
      const variance = Number(closingBalance) - expectedBalance;

      const updated = await prisma.pOSSession.update({
        where: { id: session.id },
        data: {
          closingBalance: Number(closingBalance),
          expectedBalance,
          variance,
          notes,
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });
      return sendSuccess(res, updated, 'Session closed');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getSessionHistory(req: AuthRequest, res: Response) {
    try {
      const sessions = await prisma.pOSSession.findMany({
        where: { storeId: req.user!.storeId },
        include: { cashier: { select: { name: true } } },
        orderBy: { openedAt: 'desc' },
        take: 30,
      });
      return sendSuccess(res, { sessions });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── POS Sale (in-store cash transaction) ──────────────────────────────────

  async processSale(req: AuthRequest, res: Response) {
    try {
      const { items, customerId, couponCode, cashTendered, loyaltyPointsUsed = 0 } = req.body;

      if (!items || !items.length) return sendError(res, 'No items in cart', 400);

      // Fetch products
      const productIds = items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

      const orderItems = items.map((i: any) => {
        const p = products.find((pr) => pr.id === i.productId);
        if (!p) throw new Error(`Product not found: ${i.productId}`);
        const unitPrice = i.overridePrice ?? p.sellingPrice;
        const subtotal = unitPrice * i.quantity;
        return { productId: p.id, productName: p.name, quantity: i.quantity, unitPrice, subtotal, discount: 0 };
      });

      const subtotal = orderItems.reduce((s: number, i: any) => s + i.subtotal, 0);

      // Apply promotions and coupon
      let discountAmount = 0;
      const promoIds: string[] = [];
      const promos = await prisma.promotion.findMany({
        where: { storeId: req.user!.storeId, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      });
      for (const promo of promos) {
        if (subtotal < promo.minOrderAmount) continue;
        if (promo.type === 'PERCENTAGE') discountAmount += subtotal * promo.discountValue / 100;
        else if (promo.type === 'FIXED') discountAmount += promo.discountValue;
        promoIds.push(promo.id);
      }
      if (couponCode) {
        const coupon = await prisma.coupon.findFirst({
          where: { storeId: req.user!.storeId, code: couponCode, status: 'ACTIVE', OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
        });
        if (coupon) {
          const disc = coupon.type === 'PERCENTAGE' ? subtotal * coupon.value / 100 : coupon.value;
          discountAmount += disc;
          await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        }
      }

      const loyaltyDiscount = loyaltyPointsUsed * 0.01;
      const taxAmount = (subtotal - discountAmount) * 0.08;
      const total = Math.max(0, subtotal - discountAmount - loyaltyDiscount + taxAmount);
      const change = Number(cashTendered) - total;

      if (change < 0) return sendError(res, `Insufficient cash. Need $${total.toFixed(2)}`, 400);

      const order = await prisma.order.create({
        data: {
          storeId: req.user!.storeId,
          customerId: customerId || null,
          cashierId: req.user!.userId,
          type: 'IN_STORE',
          status: 'DELIVERED',
          subtotal,
          taxAmount,
          discountAmount: discountAmount + loyaltyDiscount,
          loyaltyPointsUsed,
          total,
          paymentMethod: 'CASH',
          cashTendered: Number(cashTendered),
          changeGiven: change,
          couponCode,
          promotionIds: promoIds,
          items: { create: orderItems },
          tracking: { create: { status: 'DELIVERED', note: 'POS sale' } },
        },
        include: { items: true },
      });

      // Update stock
      for (const item of orderItems) {
        await prisma.product.update({ where: { id: item.productId! }, data: { stockQty: { decrement: item.quantity } } });
      }

      // Update promotions
      for (const promoId of promoIds) {
        await prisma.promotion.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
      }

      // Award loyalty points if customer linked
      if (customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          const pointsEarned = Math.floor(total);
          await prisma.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: { increment: pointsEarned - loyaltyPointsUsed },
              totalSpend: { increment: total },
              totalOrders: { increment: 1 },
            },
          });
          if (pointsEarned > 0) {
            await prisma.loyaltyTransaction.create({
              data: { customerId, storeId: req.user!.storeId, type: 'EARNED', points: pointsEarned, reference: order.id, description: 'POS purchase' },
            });
          }
        }
      }

      return sendSuccess(res, { order, change }, 'Sale completed', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async searchCustomer(req: AuthRequest, res: Response) {
    try {
      const { q } = req.query;
      const customers = await prisma.customer.findMany({
        where: {
          storeId: req.user!.storeId,
          user: { OR: [{ email: { contains: String(q) } }, { phone: { contains: String(q) } }, { name: { contains: String(q) } }] },
        },
        include: { user: { select: { name: true, email: true, phone: true } } },
        take: 5,
      });
      return sendSuccess(res, { customers });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async validateCoupon(req: AuthRequest, res: Response) {
    try {
      const { code, subtotal } = req.body;
      const coupon = await prisma.coupon.findFirst({
        where: { storeId: req.user!.storeId, code, status: 'ACTIVE', OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
      });
      if (!coupon) return sendError(res, 'Invalid or expired coupon', 404);
      if (coupon.minOrder > Number(subtotal)) return sendError(res, `Minimum order $${coupon.minOrder} required`, 400);
      const discount = coupon.type === 'PERCENTAGE' ? Number(subtotal) * coupon.value / 100 : coupon.value;
      return sendSuccess(res, { coupon, discount });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async searchProducts(req: AuthRequest, res: Response) {
    try {
      const { q, storeId } = req.body;
      const sid = storeId || req.user!.storeId;
      const products = await prisma.product.findMany({
        where: {
          storeId: sid,
          OR: [
            { name: { contains: String(q ?? '') } },
            { sku: { contains: String(q ?? '') } },
            { barcode: { contains: String(q ?? '') } },
          ],
          status: 'ACTIVE',
        },
        take: 20,
      });
      return sendSuccess(res, { products });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createOrder(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, [], 'Not yet implemented');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async processReturn(req: AuthRequest, res: Response) {
    try {
      const { orderId, items, reason } = req.body;
      const order = await prisma.order.findFirst({
        where: { id: orderId, storeId: req.user!.storeId },
        include: { items: true },
      });
      if (!order) return sendError(res, 'Order not found', 404);

      let refundAmount = 0;
      const returnItems = items.map((ri: any) => {
        const oi = order.items.find((i) => i.id === ri.orderItemId);
        if (!oi) throw new Error(`Order item ${ri.orderItemId} not found`);
        refundAmount += oi.unitPrice * ri.quantity;
        return { orderItemId: ri.orderItemId, quantity: ri.quantity, reason: ri.reason, condition: ri.condition };
      });

      const ret = await prisma.return.create({
        data: {
          orderId,
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

      return sendSuccess(res, { ret, refundAmount }, 'Return processed', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
