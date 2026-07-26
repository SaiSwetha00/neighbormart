import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as aiService from './ai.service';

export async function chatHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message } = req.body;
    if (!message?.trim()) { sendError(res, 'Message is required', 400); return; }
    const { userId, storeId, role } = req.user!;
    const reply = await aiService.chat(userId, role, storeId, message);
    sendSuccess(res, { reply });
  } catch (err: any) {
    sendError(res, err.message || 'AI service error', 500);
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, storeId } = req.user!;
    const messages = await aiService.getConversation(userId, storeId);
    sendSuccess(res, { messages });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function clearConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, storeId } = req.user!;
    await aiService.clearConversation(userId, storeId);
    sendSuccess(res, null, 'Conversation cleared');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getInsights(req: AuthRequest, res: Response): Promise<void> {
  try {
    const insights = await aiService.getInsights(req.user!.storeId);
    sendSuccess(res, { insights });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function actOnInsight(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { actionTaken } = req.body;
    const insight = await aiService.actOnInsight(req.params.id, req.user!.storeId, req.user!.userId, actionTaken || 'acted');
    sendSuccess(res, insight, 'Insight acted on');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function dismissInsight(req: AuthRequest, res: Response): Promise<void> {
  try {
    const insight = await aiService.dismissInsight(req.params.id, req.user!.userId);
    sendSuccess(res, insight, 'Insight dismissed');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAIDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await aiService.getAIDashboard(req.user!.storeId);
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getPanelInsight(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { module } = req.params;
    const text = await aiService.getPanelInsight(req.user!.storeId, module, req.user!.userId);
    sendSuccess(res, { insight: text });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
