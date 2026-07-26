import { Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError, getPagination } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const financeController = {
  // ─── Expenses ──────────────────────────────────────────────────────────────

  async listExpenses(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status, category, dateFrom, dateTo } = req.query;
      const p = Number(page), l = Number(limit);
      const where: any = { storeId: req.user!.storeId };
      if (status) where.status = status;
      if (category) where.category = String(category);
      if (dateFrom || dateTo) where.date = { ...(dateFrom && { gte: new Date(String(dateFrom)) }), ...(dateTo && { lte: new Date(String(dateTo)) }) };

      const [total, expenses] = await Promise.all([
        prisma.expense.count({ where }),
        prisma.expense.findMany({
          where,
          include: {
            loggedByUser: { select: { name: true } },
            approvedByUser: { select: { name: true } },
          },
          skip: (p - 1) * l,
          take: l,
          orderBy: { date: 'desc' },
        }),
      ]);
      return sendSuccess(res, { expenses }, 'Expenses retrieved', 200, getPagination(p, l, total));
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createExpense(req: AuthRequest, res: Response) {
    try {
      const { category, amount, description, receiptUrl, date } = req.body;
      const expense = await prisma.expense.create({
        data: {
          storeId: req.user!.storeId,
          category,
          amount: Number(amount),
          description,
          receiptUrl,
          loggedBy: req.user!.userId,
          date: date ? new Date(date) : new Date(),
        },
      });
      return sendSuccess(res, expense, 'Expense logged', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async approveExpense(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: { status, approvedBy: req.user!.userId },
      });
      return sendSuccess(res, expense, `Expense ${status.toLowerCase()}`);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async deleteExpense(req: AuthRequest, res: Response) {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Expense deleted');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── Tax Configs ───────────────────────────────────────────────────────────

  async listTaxConfigs(req: AuthRequest, res: Response) {
    try {
      const taxConfigs = await prisma.taxConfig.findMany({
        where: { storeId: req.user!.storeId },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { taxConfigs });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createTaxConfig(req: AuthRequest, res: Response) {
    try {
      const { categoryId, taxRate, taxType, taxName, isActive } = req.body;
      const config = await prisma.taxConfig.create({
        data: {
          storeId: req.user!.storeId,
          categoryId: categoryId || null,
          taxRate: Number(taxRate),
          taxType: taxType ?? 'EXCLUSIVE',
          taxName,
          isActive: isActive ?? true,
        },
      });
      return sendSuccess(res, config, 'Tax config created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async updateTaxConfig(req: AuthRequest, res: Response) {
    try {
      const { taxRate, taxType, taxName, isActive } = req.body;
      const config = await prisma.taxConfig.update({
        where: { id: req.params.id },
        data: { ...(taxRate !== undefined && { taxRate: Number(taxRate) }), ...(taxType && { taxType }), ...(taxName && { taxName }), ...(isActive !== undefined && { isActive }) },
      });
      return sendSuccess(res, config, 'Tax config updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── P&L Statement ─────────────────────────────────────────────────────────

  async getPL(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      const storeId = req.user!.storeId;
      const start = dateFrom ? new Date(String(dateFrom)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = dateTo ? new Date(String(dateTo)) : new Date();

      const [orders, expenses, purchases, wasteLogs] = await Promise.all([
        prisma.order.findMany({
          where: { storeId, createdAt: { gte: start, lte: end }, status: { notIn: ['CANCELLED'] as any } },
          select: { total: true, subtotal: true, taxAmount: true, discountAmount: true },
        }),
        prisma.expense.findMany({
          where: { storeId, date: { gte: start, lte: end }, status: 'APPROVED' },
          select: { amount: true, category: true },
        }),
        prisma.purchaseOrder.findMany({
          where: { storeId, createdAt: { gte: start, lte: end }, status: { notIn: ['CANCELLED', 'DRAFT'] as any } },
          include: { items: { select: { quantity: true, unitPrice: true } } },
        }),
        prisma.wasteLog.findMany({
          where: { storeId, createdAt: { gte: start, lte: end } },
          select: { financialValue: true },
        }),
      ]);

      const revenue = orders.reduce((s, o) => s + o.total, 0);
      const cogs = purchases.reduce((s, po) => s + po.items.reduce((si, i) => si + i.quantity * i.unitPrice, 0), 0);
      const grossProfit = revenue - cogs;
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const wasteValue = wasteLogs.reduce((s, w) => s + (w.financialValue ?? 0), 0);
      const netProfit = grossProfit - totalExpenses - wasteValue;

      // Expense by category
      const expByCategory: Record<string, number> = {};
      for (const e of expenses) {
        expByCategory[e.category] = (expByCategory[e.category] ?? 0) + e.amount;
      }

      return sendSuccess(res, {
        period: { from: start, to: end },
        income: { revenue, tax: orders.reduce((s, o) => s + o.taxAmount, 0), discounts: orders.reduce((s, o) => s + o.discountAmount, 0) },
        cogs,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        expenses: { total: totalExpenses, byCategory: expByCategory },
        waste: wasteValue,
        netProfit,
        netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── Cash Flow ─────────────────────────────────────────────────────────────

  async getCashflow(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, [], 'Not yet implemented');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  // ─── Revenue Forecast (simple linear regression on last 30 days) ──────────

  async getForecast(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const orders = await prisma.order.findMany({
        where: { storeId, createdAt: { gte: thirtyDaysAgo }, status: { notIn: ['CANCELLED'] as any } },
        select: { total: true, createdAt: true },
      });

      const dailyMap: Record<string, number> = {};
      for (const o of orders) {
        const d = o.createdAt.toISOString().slice(0, 10);
        dailyMap[d] = (dailyMap[d] ?? 0) + o.total;
      }
      const days = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
      const n = days.length;
      if (n < 3) return sendSuccess(res, { forecast: [], message: 'Insufficient data' });

      // Simple linear regression
      const xMean = (n - 1) / 2;
      const yMean = days.reduce((s, [, v]) => s + v, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (days[i][1] - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den !== 0 ? num / den : 0;
      const intercept = yMean - slope * xMean;

      const forecast = Array.from({ length: 7 }, (_, i) => {
        const x = n + i;
        const date = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return { date, predicted: Math.max(0, intercept + slope * x) };
      });

      return sendSuccess(res, { history: days.map(([date, amount]) => ({ date, amount })), forecast });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
