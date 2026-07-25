import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import {
  getOwnerDashboard,
  getManagerDashboard,
  getInventoryDashboard,
  getSupplierDashboard,
  getStaffDashboard,
} from './dashboard.controller';

const router = Router();

/**
 * @route  GET /api/dashboard/owner
 * @access Owner only
 */
router.get('/dashboard/owner', authenticate, requireOwner, getOwnerDashboard);

/**
 * @route  GET /api/dashboard/manager
 * @access Manager+
 */
router.get('/dashboard/manager', authenticate, requireManager, getManagerDashboard);

/**
 * @route  GET /api/dashboard/inventory
 * @access Manager+
 */
router.get('/dashboard/inventory', authenticate, requireManager, getInventoryDashboard);

/**
 * @route  GET /api/dashboard/supplier
 * @access Manager+
 */
router.get('/dashboard/supplier', authenticate, requireManager, getSupplierDashboard);

/**
 * @route  GET /api/dashboard/staff
 * @access Manager+
 */
router.get('/dashboard/staff', authenticate, requireManager, getStaffDashboard);

export default router;
