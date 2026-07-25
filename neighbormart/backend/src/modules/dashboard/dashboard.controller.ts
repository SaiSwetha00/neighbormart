import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import * as DashboardService from './dashboard.service';

export const getOwnerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }
    const data = await DashboardService.getOwnerDashboard(storeId);
    sendSuccess(res, data, 'Owner dashboard loaded successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load owner dashboard', 500);
  }
};

export const getManagerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }
    const data = await DashboardService.getManagerDashboard(storeId);
    sendSuccess(res, data, 'Manager dashboard loaded successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load manager dashboard', 500);
  }
};

export const getInventoryDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }
    const data = await DashboardService.getInventoryDashboard(storeId);
    sendSuccess(res, data, 'Inventory dashboard loaded successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load inventory dashboard', 500);
  }
};

export const getSupplierDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }
    const data = await DashboardService.getSupplierDashboard(storeId);
    sendSuccess(res, data, 'Supplier dashboard loaded successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load supplier dashboard', 500);
  }
};

export const getStaffDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      sendError(res, 'Store ID not found on user', 400);
      return;
    }
    const data = await DashboardService.getStaffDashboard(storeId);
    sendSuccess(res, data, 'Staff dashboard loaded successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load staff dashboard', 500);
  }
};
