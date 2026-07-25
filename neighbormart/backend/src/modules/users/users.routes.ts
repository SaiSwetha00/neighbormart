import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  managersController,
  staffController,
  profileController,
  storeController,
} from './users.controller';
import {
  createManagerSchema,
  updateManagerSchema,
  createStaffSchema,
  updateStaffSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './users.schema';

const router = Router();

// ─── Managers ─────────────────────────────────────────────────────────────────
// Owner-only access for all manager routes

router.get('/managers', authenticate, requireOwner, managersController.getAll);

router.post(
  '/managers',
  authenticate,
  requireOwner,
  validate(createManagerSchema),
  managersController.create,
);

router.get('/managers/:id', authenticate, requireOwner, managersController.getOne);

router.put(
  '/managers/:id',
  authenticate,
  requireOwner,
  validate(updateManagerSchema),
  managersController.update,
);

router.patch(
  '/managers/:id/status',
  authenticate,
  requireOwner,
  managersController.updateStatus,
);

router.patch(
  '/managers/:id/permissions',
  authenticate,
  requireOwner,
  managersController.updatePermissions,
);

router.patch(
  '/managers/:id/reset-password',
  authenticate,
  requireOwner,
  managersController.resetPassword,
);

router.delete('/managers/:id', authenticate, requireOwner, managersController.delete);

// ─── Staff ────────────────────────────────────────────────────────────────────
// Manager+ access for read/write; Owner-only for delete

router.get('/staff/next-employee-id', authenticate, requireManager, staffController.getNextEmployeeId);
router.get('/staff', authenticate, requireManager, staffController.getAll);

router.post(
  '/staff',
  authenticate,
  requireManager,
  validate(createStaffSchema),
  staffController.create,
);

router.get('/staff/:id', authenticate, requireManager, staffController.getOne);

router.put(
  '/staff/:id',
  authenticate,
  requireManager,
  validate(updateStaffSchema),
  staffController.update,
);

router.patch('/staff/:id/status', authenticate, requireManager, staffController.updateStatus);

// Only owners can delete (terminate) staff
router.delete('/staff/:id', authenticate, requireOwner, staffController.delete);

// ─── Store Settings ───────────────────────────────────────────────────────────
// Owner-only for store configuration

router.get('/store', authenticate, requireOwner, storeController.get);
router.put('/store', authenticate, requireOwner, storeController.update);

// ─── Profile ──────────────────────────────────────────────────────────────────
// Any authenticated user can manage their own profile

router.get('/profile', authenticate, profileController.get);

router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  profileController.update,
);

router.post('/profile/photo', authenticate, profileController.uploadPhoto);

router.put(
  '/profile/change-password',
  authenticate,
  validate(changePasswordSchema),
  profileController.changePassword,
);

export default router;
