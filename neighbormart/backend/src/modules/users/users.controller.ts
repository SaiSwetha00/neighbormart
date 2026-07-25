import { Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as usersService from './users.service';
import prisma from '../../config/database';

// ── Managers ──────────────────────────────────────────────────────────────────

export const managersController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.getManagers(req.user!.storeId, req.query as Record<string, string>);
      return sendSuccess(res, result, 'Managers retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const manager = await usersService.createManager(req.user!.storeId, req.body, req.user!.userId);
      return sendSuccess(res, manager, 'Manager created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, err.message.includes('already exists') ? 409 : 500);
    }
  },

  async getOne(req: AuthRequest, res: Response) {
    try {
      const manager = await usersService.getManager(req.params.id);
      return sendSuccess(res, manager, 'Manager retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Manager not found' ? 404 : 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const manager = await usersService.updateManager(req.params.id, req.body);
      return sendSuccess(res, manager, 'Manager updated successfully');
    } catch (err: any) {
      const status = err.message === 'Manager not found' ? 404 : err.message === 'Email already in use' ? 409 : 500;
      return sendError(res, err.message, status);
    }
  },

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!status) return sendError(res, 'Status is required', 400);
      const manager = await usersService.updateManagerStatus(req.params.id, status);
      return sendSuccess(res, manager, 'Manager status updated');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Manager not found' ? 404 : 500);
    }
  },

  async updatePermissions(req: AuthRequest, res: Response) {
    try {
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== 'object') return sendError(res, 'Permissions object is required', 400);
      const manager = await usersService.updateManagerPermissions(req.params.id, permissions);
      return sendSuccess(res, manager, 'Manager permissions updated');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Manager not found' ? 404 : 500);
    }
  },

  async resetPassword(req: AuthRequest, res: Response) {
    try {
      const { newPassword } = req.body;
      if (!newPassword) return sendError(res, 'New password is required', 400);
      const result = await usersService.resetManagerPassword(req.params.id, newPassword);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Manager not found' ? 404 : 500);
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.deleteManager(req.params.id);
      return sendSuccess(res, null, result.message);
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Manager not found' ? 404 : 500);
    }
  },
};

// ── Staff ─────────────────────────────────────────────────────────────────────

export const staffController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.getStaff(req.user!.storeId, req.query as Record<string, string>);
      return sendSuccess(res, result, 'Staff retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const staff = await usersService.createStaff(req.user!.storeId, req.body, req.user!.userId);
      return sendSuccess(res, staff, 'Staff member created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, err.message.includes('already exists') ? 409 : 500);
    }
  },

  async getOne(req: AuthRequest, res: Response) {
    try {
      const staff = await usersService.getStaffMember(req.params.id);
      return sendSuccess(res, staff, 'Staff member retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Staff member not found' ? 404 : 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const staff = await usersService.updateStaff(req.params.id, req.body);
      return sendSuccess(res, staff, 'Staff member updated');
    } catch (err: any) {
      const status = err.message === 'Staff member not found' ? 404 : err.message === 'Email already in use' ? 409 : 500;
      return sendError(res, err.message, status);
    }
  },

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!status) return sendError(res, 'Status is required', 400);
      const staff = await usersService.updateStaffStatus(req.params.id, status);
      return sendSuccess(res, staff, 'Staff status updated');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Staff member not found' ? 404 : 500);
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.deleteStaff(req.params.id);
      return sendSuccess(res, null, result.message);
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'Staff member not found' ? 404 : 500);
    }
  },

  async getNextEmployeeId(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.getNextEmployeeId(req.user!.storeId);
      return sendSuccess(res, result, 'Next employee ID retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ── Store Settings ────────────────────────────────────────────────────────────

export const storeController = {
  async get(req: AuthRequest, res: Response) {
    try {
      const store = await prisma.store.findUnique({ where: { id: req.user!.storeId } });
      if (!store) return sendError(res, 'Store not found', 404);
      return sendSuccess(res, store, 'Store retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { name, address, city, country, currency, timezone, lowStockThreshold, salesGoal, taxRate, taxInclusive } = req.body;
      const store = await prisma.store.update({
        where: { id: req.user!.storeId },
        data: {
          ...(name !== undefined && { name }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(country !== undefined && { country }),
          ...(currency !== undefined && { currency }),
          ...(timezone !== undefined && { timezone }),
          ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }),
          ...(salesGoal !== undefined && { salesGoal: Number(salesGoal) }),
        },
      });
      return sendSuccess(res, store, 'Store settings updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileController = {
  async get(req: AuthRequest, res: Response) {
    try {
      const profile = await usersService.getProfile(req.user!.userId);
      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'User not found' ? 404 : 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const profile = await usersService.updateProfile(req.user!.userId, req.body);
      return sendSuccess(res, profile, 'Profile updated successfully');
    } catch (err: any) {
      const status = err.message === 'User not found' ? 404 : err.message === 'Email already in use' ? 409 : 500;
      return sendError(res, err.message, status);
    }
  },

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await usersService.changePassword(req.user!.userId, currentPassword, newPassword);
      return sendSuccess(res, null, result.message);
    } catch (err: any) {
      const status = err.message === 'User not found' ? 404 : err.message === 'Current password is incorrect' ? 401 : 500;
      return sendError(res, err.message, status);
    }
  },

  async uploadPhoto(req: AuthRequest, res: Response) {
    try {
      const { photoUrl } = req.body;
      if (!photoUrl) return sendError(res, 'Photo URL is required', 400);
      const result = await usersService.uploadPhoto(req.user!.userId, photoUrl);
      return sendSuccess(res, result, 'Photo updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.message === 'User not found' ? 404 : 500);
    }
  },
};
