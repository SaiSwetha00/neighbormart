import { Router } from 'express';
import { authenticate, customerAuthenticate } from '../../middleware/auth.middleware';
import { requireStaff, requireManager } from '../../middleware/role.middleware';
import { customerOrderController, orderController, receiptController } from './orders.controller';

const router = Router();

// ─── Customer-Facing Orders ───────────────────────────────────────────────────
router.get('/customer/orders', customerAuthenticate, customerOrderController.list);
router.get('/customer/orders/:id', customerAuthenticate, customerOrderController.get);
router.post('/customer/orders', customerAuthenticate, customerOrderController.place);
router.patch('/customer/orders/:id/cancel', customerAuthenticate, customerOrderController.cancel);

// ─── Staff/Owner Order Management ─────────────────────────────────────────────
router.get('/orders', authenticate, requireStaff, orderController.list);
router.get('/orders/:id', authenticate, requireStaff, orderController.get);
router.patch('/orders/:id/status', authenticate, requireStaff, orderController.updateStatus);
router.post('/orders/:id/returns', authenticate, requireStaff, orderController.processReturn);

// ─── Receipts ────────────────────────────────────────────────────────────────
router.get('/receipts/:orderId/pdf', authenticate, requireStaff, receiptController.getPdf);

export default router;
