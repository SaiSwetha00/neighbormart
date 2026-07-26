import Anthropic from '@anthropic-ai/sdk';
import prisma from '../../config/database';
import { config } from '../../config';
import { mockChat, mockPanelInsight } from './ai.mock';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

async function getStoreContext(storeId: string, role: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [store, lowStockCount, expiringCount] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    prisma.product.count({ where: { storeId, stockQty: { lte: 10 }, status: 'ACTIVE' } }),
    prisma.productBatch.count({ where: { product: { storeId }, expiryDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), gte: now } } }),
  ]);

  if (role === 'OWNER') {
    const [todayOrders, todayRevenue] = await Promise.all([
      prisma.order.count({ where: { storeId, createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { storeId, createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
    ]);
    return {
      storeName: store?.name || 'Store',
      now: now.toISOString(),
      todayRevenue: Number(todayRevenue._sum.total || 0).toFixed(2),
      ordersToday: todayOrders,
      lowStockCount,
      expiringCount,
    };
  }

  return { storeName: store?.name || 'Store', now: now.toISOString(), lowStockCount, expiringCount };
}

function buildSystemPrompt(role: string, ctx: Record<string, unknown>): string {
  if (role === 'OWNER') {
    return `You are NeighborMart AI for the store owner. Full access to all store data. Be concise and always suggest a next action.

Store: ${ctx.storeName}
Date/Time: ${ctx.now}
Revenue today: $${ctx.todayRevenue}
Orders today: ${ctx.ordersToday}
Low stock: ${ctx.lowStockCount} items
Expiring: ${ctx.expiringCount} items (7 days)

Keep responses under 150 words. Always end with one concrete next action.`;
  }
  if (role === 'MANAGER') {
    return `You are NeighborMart AI for the store manager. Help with inventory, orders, and operations. No access to financial or salary data.

Low stock: ${ctx.lowStockCount} items
Expiring: ${ctx.expiringCount} items

Keep responses under 100 words.`;
  }
  if (role === 'STAFF') {
    return `You are a POS assistant for a grocery cashier at ${ctx.storeName}. Help with: product lookups, stock checks, return processing steps, product locations, and substitute suggestions. Keep answers very short and practical (under 50 words).`;
  }
  if (role === 'CUSTOMER') {
    return `You are a friendly shopping assistant for ${ctx.storeName}. Help customers find products, plan meals, manage budgets, and track orders. Be warm, helpful, and concise (under 80 words).`;
  }
  return `You are a helpful assistant for ${ctx.storeName}. Keep responses concise.`;
}

export async function chat(userId: string, role: string, storeId: string, message: string) {
  const [ctx, existingConv] = await Promise.all([
    getStoreContext(storeId, role),
    prisma.aIConversation.findFirst({ where: { userId, storeId } }),
  ]);

  const history = (existingConv?.messages as Array<{ role: string; content: string }>) || [];
  const trimmedHistory = history.slice(-10);

  let reply: string;

  if (!config.anthropicApiKey || config.anthropicApiKey === 'your-anthropic-api-key-here') {
    // No key configured — use mock AI
    reply = await mockChat(userId, role, storeId, message);
  } else {
    // Try real Claude API, fall back to mock if no credits / connection error
    try {
      const systemPrompt = buildSystemPrompt(role, ctx);
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: systemPrompt,
        messages: [...trimmedHistory, { role: 'user', content: message }] as Anthropic.MessageParam[],
      });
      reply = response.content[0].type === 'text' ? response.content[0].text : '';
    } catch {
      // API key present but no credits or connection issue — use mock
      reply = await mockChat(userId, role, storeId, message);
    }
  }

  const updatedMessages = [...trimmedHistory, { role: 'user', content: message }, { role: 'assistant', content: reply }];

  if (existingConv) {
    await prisma.aIConversation.update({ where: { id: existingConv.id }, data: { messages: updatedMessages } });
  } else {
    await prisma.aIConversation.create({ data: { userId, storeId, role, messages: updatedMessages } });
  }

  return reply;
}

export async function getConversation(userId: string, storeId: string) {
  const conv = await prisma.aIConversation.findFirst({ where: { userId, storeId } });
  return (conv?.messages as Array<{ role: string; content: string }>) || [];
}

export async function clearConversation(userId: string, storeId: string) {
  await prisma.aIConversation.deleteMany({ where: { userId, storeId } });
}

export async function getInsights(storeId: string) {
  return prisma.aIInsight.findMany({
    where: { storeId, dismissedBy: null },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
}

export async function actOnInsight(insightId: string, storeId: string, userId: string, actionTaken: string) {
  const [insight] = await Promise.all([
    prisma.aIInsight.update({ where: { id: insightId }, data: { isActedOn: true } }),
    prisma.aIAction.create({ data: { storeId, insightId, actionTaken, takenBy: userId } }),
  ]);
  return insight;
}

export async function dismissInsight(insightId: string, userId: string) {
  return prisma.aIInsight.update({ where: { id: insightId }, data: { dismissedBy: userId } });
}

export async function getAIDashboard(storeId: string) {
  const [insights, actions, conversations] = await Promise.all([
    prisma.aIInsight.groupBy({ by: ['priority'], where: { storeId }, _count: true }),
    prisma.aIAction.count({ where: { storeId } }),
    prisma.aIConversation.count({ where: { storeId } }),
  ]);
  return { insightsByPriority: insights, totalActions: actions, totalConversations: conversations };
}

export async function getPanelInsight(storeId: string, module: string, userId: string): Promise<string> {
  let text: string;

  if (!config.anthropicApiKey || config.anthropicApiKey === 'your-anthropic-api-key-here') {
    text = await mockPanelInsight(storeId, module);
  } else {
    try {
      const ctx = await getStoreContext(storeId, 'OWNER');
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 128,
        messages: [{
          role: 'user',
          content: `You are an AI analyst for a grocery store. Give a 1-2 sentence insight about the "${module}" module. Store data: ${JSON.stringify(ctx)}. Be specific and actionable. No preamble.`,
        }],
      });
      text = response.content[0].type === 'text' ? response.content[0].text : '';
    } catch {
      text = await mockPanelInsight(storeId, module);
    }
  }

  await prisma.aIInsight.create({ data: { storeId, type: 'PANEL', title: `${module} insight`, content: text, priority: 'LOW', module } }).catch(() => {});
  return text;
}

export async function createProactiveInsight(storeId: string, priority: string, title: string, content: string, module?: string) {
  return prisma.aIInsight.create({ data: { storeId, type: 'PROACTIVE', title, content, priority, module } });
}
