import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { getAuditLogs } from './audit.service';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }

    const {
      userId,
      module,
      action,
      startDate,
      endDate,
      page,
      limit,
    } = req.query as Record<string, string | undefined>;

    const result = await getAuditLogs(storeId, {
      userId,
      module,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });

    sendSuccess(res, result, 'Audit logs retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve audit logs', 500);
  }
};
