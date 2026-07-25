import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  adjustStockSchema,
  logWasteSchema,
  addBatchSchema,
  completeAuditSchema,
} from './inventory.schema';
import * as InventoryController from './inventory.controller';

const router = Router();

// ─── Overview & Dashboard ────────────────────────────────────────────────────
router.get(
  '/inventory',
  authenticate,
  requireManager,
  InventoryController.getOverview
);

// ─── Stock Status ────────────────────────────────────────────────────────────
router.get(
  '/inventory/low-stock',
  authenticate,
  requireManager,
  InventoryController.getLowStock
);

router.get(
  '/inventory/out-of-stock',
  authenticate,
  requireManager,
  InventoryController.getOutOfStock
);

router.get(
  '/inventory/expiring',
  authenticate,
  requireManager,
  InventoryController.getExpiring
);

// ─── Valuation (Owner only) ──────────────────────────────────────────────────
router.get(
  '/inventory/valuation',
  authenticate,
  requireOwner,
  InventoryController.getValuation
);

// ─── Stock Adjustments ───────────────────────────────────────────────────────
router.post(
  '/inventory/adjust',
  authenticate,
  requireManager,
  validate(adjustStockSchema),
  InventoryController.adjustStock
);

router.get(
  '/inventory/adjustments',
  authenticate,
  requireManager,
  InventoryController.getAdjustments
);

// ─── Waste Logs ──────────────────────────────────────────────────────────────
router.post(
  '/inventory/waste-log',
  authenticate,
  requireManager,
  validate(logWasteSchema),
  InventoryController.logWaste
);

router.get(
  '/inventory/waste-log',
  authenticate,
  requireManager,
  InventoryController.getWasteLogs
);

// ─── Batches ─────────────────────────────────────────────────────────────────
router.get(
  '/inventory/batches/:productId',
  authenticate,
  requireManager,
  InventoryController.getBatches
);

router.post(
  '/inventory/batches',
  authenticate,
  requireManager,
  validate(addBatchSchema),
  InventoryController.addBatch
);

// ─── Daily Audit ─────────────────────────────────────────────────────────────
router.get(
  '/inventory/audit/today',
  authenticate,
  requireManager,
  InventoryController.getTodayAudit
);

router.post(
  '/inventory/audit/complete',
  authenticate,
  requireManager,
  validate(completeAuditSchema),
  InventoryController.completeAudit
);

router.get(
  '/inventory/audit/history',
  authenticate,
  requireManager,
  InventoryController.getAuditHistory
);

// ─── Reports (Owner only) ────────────────────────────────────────────────────
router.get(
  '/inventory/reports/shrinkage',
  authenticate,
  requireOwner,
  InventoryController.getShrinkageReport
);

export default router;
