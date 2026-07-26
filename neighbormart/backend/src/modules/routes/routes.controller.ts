import { Response } from 'express';
import { AuthRequest as Request } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as svc from './routes.service';

export async function optimizeRoute(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    const { driverId, deliveryIds } = req.body;
    sendSuccess(res, await svc.optimizeRoute(storeId, driverId, deliveryIds));
  } catch (e: any) { sendError(res, e.message); }
}

export async function getDriverRoutes(req: Request, res: Response) {
  try {
    sendSuccess(res, await svc.getDriverRoutes(req.params.driverId));
  } catch (e: any) { sendError(res, e.message); }
}

export async function assignBatch(req: Request, res: Response) {
  try {
    const { storeId } = req.user!;
    const { driverId, deliveryIds } = req.body;
    sendSuccess(res, await svc.assignBatch(storeId, driverId, deliveryIds));
  } catch (e: any) { sendError(res, e.message); }
}
