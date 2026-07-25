import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPOSchema,
  updatePOSchema,
  receiveGoodsSchema,
  logPaymentSchema,
} from './suppliers.schema';
import * as suppliersController from './suppliers.controller';

const router = Router();

// ── Suppliers ─────────────────────────────────────────────────────────────────

router.get('/suppliers', authenticate, requireManager, suppliersController.getSuppliers);

router.post(
  '/suppliers',
  authenticate,
  requireManager,
  validate(createSupplierSchema),
  suppliersController.createSupplier
);

router.get('/suppliers/:id', authenticate, requireManager, suppliersController.getSupplier);

router.put(
  '/suppliers/:id',
  authenticate,
  requireManager,
  validate(updateSupplierSchema),
  suppliersController.updateSupplier
);

router.delete('/suppliers/:id', authenticate, requireOwner, suppliersController.deleteSupplier);

// ── Supplier Payments ─────────────────────────────────────────────────────────

router.get('/suppliers/:id/payments', authenticate, requireManager, suppliersController.getSupplierPayments);

router.post(
  '/suppliers/:id/payments',
  authenticate,
  requireManager,
  validate(logPaymentSchema),
  suppliersController.logPayment
);

// ── Supplier Performance ──────────────────────────────────────────────────────

router.get('/suppliers/:id/performance', authenticate, requireManager, suppliersController.getSupplierPerformance);

// ── Purchase Orders ───────────────────────────────────────────────────────────

router.get('/purchase-orders', authenticate, requireManager, suppliersController.getPurchaseOrders);

router.post(
  '/purchase-orders',
  authenticate,
  requireManager,
  validate(createPOSchema),
  suppliersController.createPurchaseOrder
);

router.get('/purchase-orders/:id', authenticate, requireManager, suppliersController.getPurchaseOrder);

router.put(
  '/purchase-orders/:id',
  authenticate,
  requireManager,
  validate(updatePOSchema),
  suppliersController.updatePurchaseOrder
);

router.patch(
  '/purchase-orders/:id/status',
  authenticate,
  requireManager,
  suppliersController.updatePOStatus
);

router.post(
  '/purchase-orders/:id/receive',
  authenticate,
  requireManager,
  validate(receiveGoodsSchema),
  suppliersController.receiveGoods
);

export default router;
