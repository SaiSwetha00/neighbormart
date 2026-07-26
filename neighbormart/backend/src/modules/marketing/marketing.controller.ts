import { Request, Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const marketingController = {
  async getCampaigns(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const campaigns = await prisma.campaign.findMany({
        where: { storeId },
        include: { analytics: { orderBy: { date: 'desc' }, take: 7 } },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, campaigns);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createCampaign(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { name, type, targetTier, subject, content, discountPct, budgetLimit, startAt, endAt } = req.body;
      if (!name || !type || !content) return sendError(res, 'name, type, and content are required', 400);
      const campaign = await prisma.campaign.create({
        data: { storeId, name, type, targetTier, subject, content, discountPct, budgetLimit, startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null },
      });
      return sendSuccess(res, campaign, 'Campaign created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async updateCampaign(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { id } = req.params;
      const existing = await prisma.campaign.findFirst({ where: { id, storeId } });
      if (!existing) return sendError(res, 'Campaign not found', 404);
      const { name, type, status, targetTier, subject, content, discountPct, budgetLimit, startAt, endAt } = req.body;
      const campaign = await prisma.campaign.update({
        where: { id },
        data: { name, type, status, targetTier, subject, content, discountPct, budgetLimit, startAt: startAt ? new Date(startAt) : undefined, endAt: endAt ? new Date(endAt) : undefined },
      });
      return sendSuccess(res, campaign);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async deleteCampaign(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { id } = req.params;
      const existing = await prisma.campaign.findFirst({ where: { id, storeId } });
      if (!existing) return sendError(res, 'Campaign not found', 404);
      await prisma.campaignAnalytics.deleteMany({ where: { campaignId: id } });
      await prisma.campaign.delete({ where: { id } });
      return sendSuccess(res, null, 'Campaign deleted');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async launchCampaign(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { id } = req.params;
      const existing = await prisma.campaign.findFirst({ where: { id, storeId } });
      if (!existing) return sendError(res, 'Campaign not found', 404);
      const targetCustomers = await prisma.customer.count({
        where: {
          storeId,
          ...(existing.targetTier && existing.targetTier !== 'ALL' ? { tier: existing.targetTier as any } : {}),
        },
      });
      const campaign = await prisma.campaign.update({
        where: { id },
        data: { status: 'ACTIVE', sentCount: targetCustomers },
      });
      return sendSuccess(res, { campaign, targetCustomers }, 'Campaign launched');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getCampaignAnalytics(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { id } = req.params;
      const campaign = await prisma.campaign.findFirst({ where: { id, storeId } });
      if (!campaign) return sendError(res, 'Campaign not found', 404);
      const analytics = await prisma.campaignAnalytics.findMany({
        where: { campaignId: id },
        orderBy: { date: 'asc' },
      });
      return sendSuccess(res, { campaign, analytics });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getABTests(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const tests = await prisma.aBTest.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
      return sendSuccess(res, tests);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createABTest(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const { name, variantA, variantB, trafficSplit, startAt, endAt } = req.body;
      if (!name || !variantA || !variantB) return sendError(res, 'name, variantA, and variantB are required', 400);
      const test = await prisma.aBTest.create({
        data: { storeId, name, variantA, variantB, trafficSplit: trafficSplit ?? 50, startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null },
      });
      return sendSuccess(res, test, 'A/B test created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getReferralStats(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const [total, referrals] = await Promise.all([
        prisma.customer.count({ where: { storeId } }),
        prisma.referral.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      ]);
      const conversionRate = total > 0 ? ((referrals.length / total) * 100).toFixed(1) : '0';
      return sendSuccess(res, { total, referrals, conversionRate });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
