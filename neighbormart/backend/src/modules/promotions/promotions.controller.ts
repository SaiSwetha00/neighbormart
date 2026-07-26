import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const promotionsController = {
  // ─── Promotions ────────────────────────────────────────────────────────────

  async list(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const where: any = { storeId: req.user!.storeId };
      if (status) where.status = status;
      else {
        // Auto-update expired promotions
        await prisma.promotion.updateMany({
          where: { storeId: req.user!.storeId, status: 'ACTIVE', endDate: { lt: new Date() } },
          data: { status: 'EXPIRED' },
        });
      }
      const promotions = await prisma.promotion.findMany({ where, orderBy: { createdAt: 'desc' } });
      return sendSuccess(res, { promotions });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const { name, type, discountValue, minOrderAmount, appliesTo, targetId, startDate, endDate, usageLimit } = req.body;
      const status = new Date(startDate) > new Date() ? 'SCHEDULED' : 'ACTIVE';
      const promo = await prisma.promotion.create({
        data: {
          storeId: req.user!.storeId,
          name,
          type,
          discountValue: Number(discountValue),
          minOrderAmount: Number(minOrderAmount ?? 0),
          appliesTo: appliesTo ?? 'ALL',
          targetId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          usageLimit: usageLimit ? Number(usageLimit) : null,
          status,
        },
      });
      return sendSuccess(res, promo, 'Promotion created', 201);
    } catch (err: any) {
      if (err.code && err.code.startsWith('P')) return sendError(res, 'Invalid promotion data', 422);
      return sendError(res, err.message, 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { name, discountValue, minOrderAmount, startDate, endDate, usageLimit, status } = req.body;
      const promo = await prisma.promotion.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
          ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(usageLimit !== undefined && { usageLimit: usageLimit ? Number(usageLimit) : null }),
          ...(status && { status }),
        },
      });
      return sendSuccess(res, promo, 'Promotion updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      await prisma.promotion.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Promotion deleted');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getPerformance(req: AuthRequest, res: Response) {
    try {
      const promos = await prisma.promotion.findMany({
        where: { storeId: req.user!.storeId },
        select: { id: true, name: true, type: true, discountValue: true, usageLimit: true, usedCount: true, status: true },
        orderBy: { usedCount: 'desc' },
      });
      return sendSuccess(res, { promotions: promos });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── Coupons ───────────────────────────────────────────────────────────────

  async listCoupons(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const where: any = { storeId: req.user!.storeId };
      if (status) where.status = status;
      const coupons = await prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
      return sendSuccess(res, { coupons });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createCoupon(req: AuthRequest, res: Response) {
    try {
      const { code, type, value, minOrder, usageLimit, perCustomerLimit, expiryDate } = req.body;
      const existingCode = code || 'SAVE' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const coupon = await prisma.coupon.create({
        data: {
          storeId: req.user!.storeId,
          code: existingCode,
          type,
          value: Number(value),
          minOrder: Number(minOrder ?? 0),
          usageLimit: usageLimit ? Number(usageLimit) : null,
          perCustomerLimit: Number(perCustomerLimit ?? 1),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });
      return sendSuccess(res, coupon, 'Coupon created', 201);
    } catch (err: any) {
      if (err.code === 'P2002') return sendError(res, 'Coupon code already exists', 409);
      return sendError(res, err.message, 500);
    }
  },

  async updateCoupon(req: AuthRequest, res: Response) {
    try {
      const { value, minOrder, usageLimit, expiryDate, status } = req.body;
      const coupon = await prisma.coupon.update({
        where: { id: req.params.id },
        data: {
          ...(value !== undefined && { value: Number(value) }),
          ...(minOrder !== undefined && { minOrder: Number(minOrder) }),
          ...(usageLimit !== undefined && { usageLimit: usageLimit ? Number(usageLimit) : null }),
          ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
          ...(status && { status }),
        },
      });
      return sendSuccess(res, coupon, 'Coupon updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async deleteCoupon(req: AuthRequest, res: Response) {
    try {
      await prisma.coupon.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Coupon deleted');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async validateCoupon(req: AuthRequest, res: Response) {
    try {
      const { code, subtotal } = req.body;
      const storeId = req.user!.storeId;
      const coupon = await prisma.coupon.findFirst({
        where: { storeId, code, status: 'ACTIVE', OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
      });
      if (!coupon) return sendError(res, 'Invalid or expired coupon', 404);
      if (coupon.minOrder > Number(subtotal ?? 0)) return sendError(res, `Minimum order $${coupon.minOrder} required`, 400);
      const discount = coupon.type === 'PERCENTAGE' ? Number(subtotal) * coupon.value / 100 : coupon.value;
      return sendSuccess(res, { coupon, discount });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async bulkGenerateCoupons(req: AuthRequest, res: Response) {
    try {
      const { count = 10, type, value, minOrder, usageLimit, expiryDate, prefix = 'SAVE' } = req.body;
      const coupons = await Promise.all(
        Array.from({ length: Number(count) }, async () => {
          const code = prefix + Math.random().toString(36).substring(2, 8).toUpperCase();
          return prisma.coupon.create({
            data: {
              storeId: req.user!.storeId,
              code,
              type,
              value: Number(value),
              minOrder: Number(minOrder ?? 0),
              usageLimit: usageLimit ? Number(usageLimit) : 1,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
          });
        })
      );
      return sendSuccess(res, { coupons }, `${count} coupons generated`, 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
