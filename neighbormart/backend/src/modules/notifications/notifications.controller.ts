import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const notificationsController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const { unreadOnly } = req.query;
      const where: any = {
        OR: [{ userId: req.user!.userId }, { storeId: req.user!.storeId, userId: null }],
      };
      if (unreadOnly === 'true') where.isRead = false;

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.notification.count({ where: { ...where, isRead: false } }),
      ]);
      return sendSuccess(res, { notifications, unreadCount });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async markRead(req: AuthRequest, res: Response) {
    try {
      await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
      return sendSuccess(res, null, 'Marked as read');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async markAllRead(req: AuthRequest, res: Response) {
    try {
      await prisma.notification.updateMany({
        where: { OR: [{ userId: req.user!.userId }, { storeId: req.user!.storeId, userId: null }], isRead: false },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'All marked as read');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const { userId, type, title, message, data } = req.body;
      const notification = await prisma.notification.create({
        data: {
          storeId: req.user!.storeId,
          userId: userId || null,
          type,
          title,
          message,
          data: data ?? null,
        },
      });
      return sendSuccess(res, notification, 'Notification sent', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async deleteOld(req: AuthRequest, res: Response) {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count } = await prisma.notification.deleteMany({
        where: { storeId: req.user!.storeId, createdAt: { lt: cutoff } },
      });
      return sendSuccess(res, { deleted: count }, 'Old notifications cleared');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
