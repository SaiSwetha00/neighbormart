import cron from 'node-cron';
import prisma from '../config/database';
import { createProactiveInsight } from '../modules/ai/ai.service';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

async function runProactiveChecks() {
  try {
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });

    for (const store of stores) {
      const storeId = store.id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Check 1: Critical low stock
      const criticalStock = await prisma.product.findMany({
        where: { storeId, stockQty: { lte: 3 }, status: 'ACTIVE' },
        select: { name: true, stockQty: true },
        take: 3,
      });
      for (const item of criticalStock) {
        await createProactiveInsight(storeId, 'CRITICAL', `${item.name} critically low`, `Only ${item.stockQty} units remaining. Reorder immediately.`, 'inventory').catch(() => {});
      }

      // Check 2: Revenue anomaly
      const [todayRev, prevRev] = await Promise.all([
        prisma.order.aggregate({ where: { storeId, createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
        prisma.order.aggregate({ where: { storeId, createdAt: { gte: new Date(today.getTime() - 7 * 86400000), lt: today }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
      ]);
      const todayVal = Number(todayRev._sum.total || 0);
      const avgDaily = Number(prevRev._sum.total || 0) / 7;
      if (avgDaily > 0 && todayVal < avgDaily * 0.7 && now.getHours() >= 14) {
        await createProactiveInsight(storeId, 'HIGH', 'Revenue below average', `Today's revenue ($${todayVal.toFixed(0)}) is 30%+ below your daily average ($${avgDaily.toFixed(0)}).`, 'sales').catch(() => {});
      }

      // Check 3: Expiring soon
      const threeDays = new Date(now.getTime() + 3 * 86400000);
      const expiringCount = await prisma.productBatch.count({ where: { product: { storeId }, expiryDate: { lte: threeDays, gte: now } } });
      if (expiringCount > 0) {
        await createProactiveInsight(storeId, 'HIGH', `${expiringCount} batches expire in 3 days`, 'Consider running promotions or marking these items down to reduce waste.', 'inventory').catch(() => {});
      }
    }
  } catch (err) {
    console.error('Proactive check error:', err);
  }
}

async function generateDailyBrief() {
  try {
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    for (const store of stores) {
      const yesterday = new Date(Date.now() - 86400000);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const [revenue, orders, lowStock] = await Promise.all([
        prisma.order.aggregate({ where: { storeId: store.id, createdAt: { gte: yesterday }, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: true }),
        prisma.order.aggregate({ where: { storeId: store.id, createdAt: { gte: weekAgo }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
        prisma.product.count({ where: { storeId: store.id, stockQty: { lte: 10 }, status: 'ACTIVE' } }),
      ]);

      if (!config.anthropicApiKey || config.anthropicApiKey === 'your-anthropic-api-key-here') return;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Generate a morning brief for the owner of ${store.name} grocery store (under 150 words):
1. Yesterday's performance: ${revenue._count} orders, $${Number(revenue._sum.total || 0).toFixed(2)} revenue
2. 7-day total: $${Number(orders._sum.total || 0).toFixed(2)}
3. Low stock items: ${lowStock}
Include 3 focus areas for today. Be specific and actionable.`,
        }],
      });
      const brief = response.content[0].type === 'text' ? response.content[0].text : '';
      await createProactiveInsight(store.id, 'MEDIUM', 'Good morning! Daily brief ready', brief, 'dashboard').catch(() => {});
    }
  } catch (err) {
    console.error('Daily brief error:', err);
  }
}

export function startProactiveJobs() {
  // Run proactive checks every hour
  cron.schedule('0 * * * *', runProactiveChecks);
  // Daily brief at 6 AM
  cron.schedule('0 6 * * *', generateDailyBrief);
  console.log('Proactive AI jobs started');
}
