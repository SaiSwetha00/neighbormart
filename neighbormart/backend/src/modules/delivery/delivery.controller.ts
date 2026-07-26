import { Response } from 'express';
import { AuthRequest as Request } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as svc from './delivery.service';

export async function getDashboard(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    const data = await svc.getDashboardStats(storeId);
    sendSuccess(res, data);
  } catch (e: any) { sendError(res, e.message); }
}

export async function getOrders(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    const { status } = req.query as { status?: string };
    const data = await svc.getDeliveryOrders(storeId, status);
    sendSuccess(res, data);
  } catch (e: any) { sendError(res, e.message); }
}

export async function assignDriver(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    const { deliveryId, driverId } = req.body;
    const data = await svc.assignDriver(deliveryId, driverId, storeId);
    sendSuccess(res, data);
  } catch (e: any) { sendError(res, e.message); }
}

export async function getZones(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.getZones(storeId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function createZone(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.createZone(storeId, req.body), 'Created', 201);
  } catch (e: any) { sendError(res, e.message); }
}

export async function updateZone(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.updateZone(req.params.id, storeId, req.body));
  } catch (e: any) { sendError(res, e.message); }
}

export async function deleteZone(req: Request, res: Response) {
  try {
    await svc.deleteZone(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (e: any) { sendError(res, e.message); }
}

export async function getSlots(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.getSlots(storeId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function createSlot(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.createSlot(storeId, req.body), 'Created', 201);
  } catch (e: any) { sendError(res, e.message); }
}

export async function updateSlot(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.updateSlot(req.params.id, req.body));
  } catch (e: any) { sendError(res, e.message); }
}

export async function deleteSlot(req: Request, res: Response) {
  try {
    await svc.deleteSlot(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (e: any) { sendError(res, e.message); }
}

export async function getLive(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.getLiveDeliveries(storeId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getTracking(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getOrderTracking(req.params.orderId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getPerformance(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    sendSuccess(res, await svc.getDriverPerformance(storeId));
  } catch (e: any) { sendError(res, e.message); }
}
