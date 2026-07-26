import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const adminController = {
  async getAllStores(req: AuthRequest, res: Response) {
    try {
      const stores = await prisma.store.findMany({
        include: {
          _count: { select: { users: true, orders: true, products: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, stores);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async updateStoreStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['ACTIVE', 'SUSPENDED'].includes(status)) return sendError(res, 'Invalid status', 400);
      const store = await prisma.store.update({ where: { id }, data: { status } });
      return sendSuccess(res, store, `Store ${status.toLowerCase()}`);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const { role, status, page = '1', limit = '50' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = {};
      if (role) where.role = role;
      if (status) where.status = status;
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, store: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.user.count({ where }),
      ]);
      return sendSuccess(res, { users, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getPlatformRevenue(req: AuthRequest, res: Response) {
    try {
      const [totalRevenue, monthlyOrders, topStores] = await Promise.all([
        prisma.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED' } }),
        prisma.order.groupBy({
          by: ['createdAt'],
          _sum: { total: true },
          _count: true,
          where: { status: 'DELIVERED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        prisma.store.findMany({
          take: 10,
          include: { _count: { select: { orders: true } } },
          orderBy: { orders: { _count: 'desc' } },
        }),
      ]);
      return sendSuccess(res, {
        totalRevenue: totalRevenue._sum.total ?? 0,
        monthlyOrders: monthlyOrders.length,
        topStores,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getAIUsage(req: AuthRequest, res: Response) {
    try {
      const [totalConversations, totalInsights, recentConversations] = await Promise.all([
        prisma.aIConversation.count(),
        prisma.aIInsight.count(),
        prisma.aIConversation.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: { id: true, storeId: true, role: true, createdAt: true, updatedAt: true, store: { select: { name: true } } },
        }),
      ]);
      return sendSuccess(res, { totalConversations, totalInsights, recentConversations });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getPlatformSettings(req: AuthRequest, res: Response) {
    try {
      const storeCount = await prisma.store.count();
      const userCount = await prisma.user.count();
      const orderCount = await prisma.order.count();
      return sendSuccess(res, {
        storeCount,
        userCount,
        orderCount,
        version: '5.0.0',
        features: { marketing: true, i18n: true, accessibility: true, darkMode: true, superAdmin: true },
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async exportUserData(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          sessions: false,
          loginHistory: true,
          auditLogs: { take: 100, orderBy: { createdAt: 'desc' } },
          customer: { include: { orders: { take: 50 }, loyaltyTxs: { take: 50 } } },
        },
      });
      if (!user) return sendError(res, 'User not found', 404);
      const { password, mfaSecret, ...safeUser } = user as any;
      return sendSuccess(res, { exportedAt: new Date().toISOString(), userData: safeUser });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async softDeleteUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: 'TERMINATED', email: `deleted_${userId}@removed.invalid`, name: '[Deleted User]' },
      });
      return sendSuccess(res, { id: user.id }, 'User data anonymized (GDPR soft delete)');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
