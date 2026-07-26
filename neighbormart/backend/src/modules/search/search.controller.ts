import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '../../config/database';
import { config } from '../../config';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

export async function visualSearch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { imageBase64, mediaType = 'image/jpeg' } = req.body as { imageBase64: string; mediaType?: string };
    if (!imageBase64) { sendError(res, 'Image data required', 400); return; }

    const storeId = req.body.storeId || req.user?.storeId || '';

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: 'Identify this grocery product. Return JSON only with no markdown: {"name":"...","category":"...","brand":"...","keywords":["...","..."]}' },
        ],
      }],
    });

    const text = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text.trim() : '{}';
    let parsed: { name?: string; category?: string; brand?: string; keywords?: string[] } = {};
    try { parsed = JSON.parse(text); } catch { parsed = { keywords: [text.substring(0, 30)] }; }

    const keywords = parsed.keywords || [parsed.name || ''];
    const where: any = { status: 'ACTIVE' };
    if (storeId) where.storeId = storeId;

    const products = await prisma.product.findMany({
      where: { ...where, OR: keywords.map((k: string) => ({ name: { contains: k } })) },
      include: { images: { take: 1 }, category: { select: { name: true } } },
      take: 12,
    });

    sendSuccess(res, { identified: parsed, products });
  } catch (err: any) {
    sendError(res, err.message || 'Visual search failed', 500);
  }
}

export async function smartSearch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { q, storeId } = req.query as { q: string; storeId?: string };
    if (!q) { sendSuccess(res, { products: [] }); return; }

    const sid = storeId || req.user?.storeId || '';
    const where: any = { status: 'ACTIVE', name: { contains: String(q) } };
    if (sid) where.storeId = sid;

    const products = await prisma.product.findMany({
      where,
      include: { images: { take: 1 }, category: { select: { name: true } } },
      take: 10,
    });
    sendSuccess(res, { products });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getRecommendations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { customerId } = req.params;
    const storeId = (req.body?.storeId || req.query?.storeId) as string || '';

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { items: { include: { product: { select: { categoryId: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const catIds = [...new Set(orders.flatMap(o => o.items.map(i => i.product?.categoryId).filter(Boolean)))] as string[];
    const where: any = { status: 'ACTIVE', stockQty: { gt: 0 } };
    if (storeId) where.storeId = storeId;
    if (catIds.length > 0) where.categoryId = { in: catIds };

    const products = await prisma.product.findMany({
      where,
      include: { images: { take: 1 }, category: { select: { name: true } } },
      orderBy: { stockQty: 'desc' },
      take: 8,
    });
    sendSuccess(res, { products });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
