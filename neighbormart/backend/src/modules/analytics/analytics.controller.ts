import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import prisma from '../../config/database';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { mockReportSummary } from '../ai/ai.mock';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

export async function listReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const reports = await prisma.report.findMany({ where: { storeId: req.user!.storeId }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, { reports });
  } catch (err: any) { sendError(res, err.message, 500); }
}

export async function createReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, type, config: cfg, schedule } = req.body;
    const report = await prisma.report.create({
      data: { storeId: req.user!.storeId, name, type, config: cfg || {}, createdBy: req.user!.userId, schedule },
    });
    sendSuccess(res, report, 'Report created', 201);
  } catch (err: any) { sendError(res, err.message, 500); }
}

export async function runReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) { sendError(res, 'Report not found', 404); return; }
    const cfg = report.config as Record<string, unknown>;
    const storeId = req.user!.storeId;
    const startDate = cfg.startDate ? new Date(cfg.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = cfg.endDate ? new Date(cfg.endDate as string) : new Date();

    let data: unknown = {};
    if (report.type === 'SALES') {
      data = await prisma.order.aggregate({ where: { storeId, createdAt: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: true });
    } else if (report.type === 'INVENTORY') {
      data = await prisma.product.findMany({ where: { storeId }, select: { name: true, stockQty: true, sellingPrice: true, status: true }, take: 100 });
    } else if (report.type === 'LOW_STOCK') {
      data = await prisma.product.findMany({ where: { storeId, stockQty: { lte: 10 }, status: 'ACTIVE' }, select: { name: true, stockQty: true, lowStockThreshold: true }, orderBy: { stockQty: 'asc' } });
    } else if (report.type === 'WASTE') {
      data = await prisma.wasteLog.findMany({ where: { product: { storeId }, createdAt: { gte: startDate, lte: endDate } }, include: { product: { select: { name: true } } } });
    } else if (report.type === 'CUSTOMERS') {
      data = await prisma.customer.findMany({ where: { storeId }, select: { loyaltyPoints: true, tier: true, user: { select: { name: true, createdAt: true } } }, take: 100 });
    }

    await prisma.report.update({ where: { id: report.id }, data: { lastRun: new Date() } });
    sendSuccess(res, { report, data });
  } catch (err: any) { sendError(res, err.message, 500); }
}

export async function getReportAISummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reportData, reportType } = req.body;
    if (!reportData) { sendError(res, 'Report data required', 400); return; }

    let summary: string;
    if (!config.anthropicApiKey || config.anthropicApiKey === 'your-anthropic-api-key-here') {
      summary = mockReportSummary(reportData, reportType || 'GENERAL');
    } else {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Analyze this ${reportType} report data for a grocery store. Provide:\n1. Key finding (1 sentence)\n2. Three actionable recommendations (bullets)\n3. One thing to watch out for\n\nData: ${JSON.stringify(reportData).substring(0, 2000)}\n\nKeep total response under 200 words.`,
          }],
        });
        summary = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch {
        summary = mockReportSummary(reportData, reportType || 'GENERAL');
      }
    }
    sendSuccess(res, { summary });
  } catch (err: any) { sendError(res, err.message, 500); }
}

export async function getProductPerformance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const days = parseInt(req.query.days as string || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { storeId, createdAt: { gte: since }, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 20,
    });
    const productIds = items.map(i => i.productId).filter(Boolean) as string[];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sellingPrice: true } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const result = items.map(i => ({ ...productMap[i.productId!], totalQty: i._sum.quantity, totalRevenue: i._sum.subtotal }));
    sendSuccess(res, { products: result });
  } catch (err: any) { sendError(res, err.message, 500); }
}

export async function getCustomerBehavior(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const [totalCustomers, avgOrderValue, repeatCustomers] = await Promise.all([
      prisma.customer.count({ where: { storeId } }),
      prisma.order.aggregate({ where: { storeId, status: { not: 'CANCELLED' } }, _avg: { total: true } }),
      prisma.order.groupBy({ by: ['customerId'], where: { storeId }, having: { customerId: { _count: { gt: 1 } } }, _count: true }).then(r => r.length),
    ]);
    sendSuccess(res, { totalCustomers, avgOrderValue: Number(avgOrderValue._avg.total || 0).toFixed(2), repeatCustomers });
  } catch (err: any) { sendError(res, err.message, 500); }
}
