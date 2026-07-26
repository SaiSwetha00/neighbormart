import { Response } from 'express';
import { AuthRequest as Request } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as svc from './driver.service';

export async function goOnline(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.goOnline(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function goOffline(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.goOffline(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getTodayDeliveries(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getTodayDeliveries(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function acceptDelivery(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.updateDeliveryStatus(req.user!.userId, req.params.id, 'IN_TRANSIT'));
  } catch (e: any) { sendError(res, e.message); }
}

export async function rejectDelivery(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.updateDeliveryStatus(req.user!.userId, req.params.id, 'PENDING'));
  } catch (e: any) { sendError(res, e.message); }
}

export async function pickedUp(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.updateDeliveryStatus(req.user!.userId, req.params.id, 'PICKED_UP'));
  } catch (e: any) { sendError(res, e.message); }
}

export async function delivered(req: Request, res: Response) {
  try {
    const { proofPhotoUrl } = req.body;
    sendSuccess(res, await svc.updateDeliveryStatus(req.user!.userId, req.params.id, 'DELIVERED', { proofPhotoUrl }));
  } catch (e: any) { sendError(res, e.message); }
}

export async function failed(req: Request, res: Response) {
  try {
    const { failureReason } = req.body;
    sendSuccess(res, await svc.updateDeliveryStatus(req.user!.userId, req.params.id, 'FAILED', { failureReason }));
  } catch (e: any) { sendError(res, e.message); }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const { lat, lng } = req.body;
    await svc.updateLocation(req.user!.userId, lat, lng);
    sendSuccess(res, { updated: true });
  } catch (e: any) { sendError(res, e.message); }
}

export async function getEarnings(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getEarnings(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getRatings(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getRatings(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getPerformance(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getPerformance(req.user!.userId));
  } catch (e: any) { sendError(res, e.message); }
}
