import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as InventoryService from './inventory.service';

export async function getOverview(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getInventoryOverview(req.user!.storeId);
    sendSuccess(res, data, 'Inventory overview fetched successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch inventory overview');
  }
}

export async function getLowStock(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getLowStock(req.user!.storeId);
    sendSuccess(res, data, 'Low stock products fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch low stock');
  }
}

export async function getOutOfStock(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getOutOfStock(req.user!.storeId);
    sendSuccess(res, data, 'Out of stock products fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch out of stock');
  }
}

export async function getExpiring(req: AuthRequest, res: Response) {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const data = await InventoryService.getExpiring(req.user!.storeId, isNaN(days) ? 7 : days);
    sendSuccess(res, data, 'Expiring products fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch expiring products');
  }
}

export async function getValuation(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getValuation(req.user!.storeId);
    sendSuccess(res, data, 'Inventory valuation fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch valuation');
  }
}

export async function adjustStock(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.adjustStock(req.user!.storeId, req.body, req.user!.userId);
    sendSuccess(res, data, 'Stock adjusted successfully', 201);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to adjust stock');
  }
}

export async function getAdjustments(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getAdjustments(req.user!.storeId, req.query.productId as string | undefined);
    sendSuccess(res, data, 'Stock adjustments fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch adjustments');
  }
}

export async function logWaste(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.logWaste(req.user!.storeId, req.body, req.user!.userId);
    sendSuccess(res, data, 'Waste logged successfully', 201);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to log waste');
  }
}

export async function getWasteLogs(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getWasteLogs(req.user!.storeId);
    sendSuccess(res, data, 'Waste logs fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch waste logs');
  }
}

export async function getBatches(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getBatches(req.params.productId);
    sendSuccess(res, data, 'Batches fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch batches');
  }
}

export async function addBatch(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.addBatch(req.body);
    sendSuccess(res, data, 'Batch added successfully', 201);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to add batch');
  }
}

export async function getTodayAudit(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getTodayAudit(req.user!.storeId);
    sendSuccess(res, data, "Today's audit fetched");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch today's audit");
  }
}

export async function completeAudit(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.completeAudit(req.user!.storeId, req.body, req.user!.userId);
    sendSuccess(res, data, 'Audit completed successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to complete audit');
  }
}

export async function getAuditHistory(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getAuditHistory(req.user!.storeId);
    sendSuccess(res, data, 'Audit history fetched');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to fetch audit history');
  }
}

export async function getShrinkageReport(req: AuthRequest, res: Response) {
  try {
    const data = await InventoryService.getShrinkageReport(req.user!.storeId);
    sendSuccess(res, data, 'Shrinkage report generated');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to generate shrinkage report');
  }
}
