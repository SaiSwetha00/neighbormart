import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError, getPagination } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const salesController = {
  async overview(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      const storeId = req.user!.storeId;
      const start = dateFrom ? new Date(String(dateFrom)) : new Date(new Date().setDate(1)); // month start
      const end = dateTo ? new Date(String(dateTo)) : new Date();

      const where = { storeId, createdAt: { gte: start, lte: end }, status: { notIn: ['CANCELLED'] as any } };

      const [orders, prevOrders, topProducts, staffPerf] = await Promise.all([
        prisma.order.findMany({ where, select: { total: true, subtotal: true, taxAmount: true, discountAmount: true, createdAt: true, type: true } }),
        prisma.order.findMany({
          where: {
            storeId,
            createdAt: { gte: new Date(start.getTime() - (end.getTime() - start.getTime())), lte: start },
            status: { notIn: ['CANCELLED'] as any },
          },
          select: { total: true },
        }),
        prisma.orderItem.findMany({
          where: { order: where },
          select: { productId: true, productName: true, quantity: true, subtotal: true },
        }),
        prisma.order.groupBy({
          by: ['cashierId'],
          where: { ...where, cashierId: { not: null } },
          _count: { id: true },
          _sum: { total: true },
        }),
      ]);

      const revenue = orders.reduce((s, o) => s + o.total, 0);
      const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
      const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Daily revenue for chart
      const dailyMap: Record<string, number> = {};
      for (const o of orders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] ?? 0) + o.total;
      }
      const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

      // Hourly heatmap
      const hourlyMap: Record<number, number> = {};
      for (const o of orders) {
        const h = o.createdAt.getHours();
        hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
      }
      const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourlyMap[h] ?? 0 }));

      // Top products
      const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
      for (const item of topProducts) {
        const id = item.productId ?? item.productName;
        if (!productMap[id]) productMap[id] = { name: item.productName, quantity: 0, revenue: 0 };
        productMap[id].quantity += item.quantity;
        productMap[id].revenue += item.subtotal;
      }
      const topProductsList = Object.entries(productMap)
        .map(([id, v]) => ({ productId: id, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Cashier IDs → names
      const cashierIds = staffPerf.map((s) => s.cashierId).filter(Boolean) as string[];
      const cashiers = await prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, name: true } });
      const staffPerformance = staffPerf.map((s) => ({
        cashierId: s.cashierId,
        name: cashiers.find((c) => c.id === s.cashierId)?.name ?? 'Unknown',
        orders: s._count.id,
        revenue: s._sum.total ?? 0,
      }));

      return sendSuccess(res, {
        summary: {
          revenue,
          revenueChange,
          orders: orders.length,
          avgOrderValue: orders.length ? revenue / orders.length : 0,
          taxCollected: orders.reduce((s, o) => s + o.taxAmount, 0),
          discountsGiven: orders.reduce((s, o) => s + o.discountAmount, 0),
        },
        dailyRevenue,
        peakHours,
        topProducts: topProductsList,
        staffPerformance,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async transactions(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 25, dateFrom, dateTo, type, cashierId } = req.query;
      const p = Number(page), l = Number(limit);
      const where: any = { storeId: req.user!.storeId };
      if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: new Date(String(dateFrom)) }), ...(dateTo && { lte: new Date(String(dateTo)) }) };
      if (type) where.type = type;
      if (cashierId) where.cashierId = String(cashierId);

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: {
            customer: { include: { user: { select: { name: true } } } },
            cashier: { select: { name: true } },
            items: { select: { productName: true, quantity: true, subtotal: true } },
          },
          skip: (p - 1) * l,
          take: l,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return sendSuccess(res, { orders }, 'Transactions retrieved', 200, getPagination(p, l, total));
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async byProduct(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      const where: any = { order: { storeId: req.user!.storeId, status: { notIn: ['CANCELLED'] } } };
      if (dateFrom || dateTo) where.order = { ...where.order, createdAt: { ...(dateFrom && { gte: new Date(String(dateFrom)) }), ...(dateTo && { lte: new Date(String(dateTo)) }) } };

      const items = await prisma.orderItem.findMany({ where, select: { productId: true, productName: true, quantity: true, subtotal: true } });
      const map: Record<string, any> = {};
      for (const item of items) {
        const k = item.productId ?? item.productName;
        if (!map[k]) map[k] = { productId: k, name: item.productName, quantity: 0, revenue: 0 };
        map[k].quantity += item.quantity;
        map[k].revenue += item.subtotal;
      }
      const products = Object.values(map).sort((a, b) => b.revenue - a.revenue);
      return sendSuccess(res, { products });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async staffPerformance(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      const where: any = { storeId: req.user!.storeId, cashierId: { not: null } };
      if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: new Date(String(dateFrom)) }), ...(dateTo && { lte: new Date(String(dateTo)) }) };

      const grouped = await prisma.order.groupBy({ by: ['cashierId'], where, _count: { id: true }, _sum: { total: true } });
      const ids = grouped.map((g) => g.cashierId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      const performance = grouped.map((g) => ({
        cashierId: g.cashierId,
        name: users.find((u) => u.id === g.cashierId)?.name ?? 'Unknown',
        orders: g._count.id,
        revenue: g._sum.total ?? 0,
        avgOrder: g._count.id > 0 ? (g._sum.total ?? 0) / g._count.id : 0,
      }));
      return sendSuccess(res, { performance });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
