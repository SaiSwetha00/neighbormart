import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff, requireManager } from '../../middleware/role.middleware';
import { posController } from './pos.controller';

const router = Router();

// POS Sessions (cash drawer)
router.get('/pos/session/active', authenticate, requireStaff, posController.getActiveSession);
router.post('/pos/session/open', authenticate, requireStaff, posController.openSession);
router.patch('/pos/session/:id/close', authenticate, requireStaff, posController.closeSession);
router.get('/pos/sessions', authenticate, requireManager, posController.getSessionHistory);

// POS Operations
router.post('/pos/sale', authenticate, requireStaff, posController.processSale);
router.get('/pos/customer-search', authenticate, requireStaff, posController.searchCustomer);
router.post('/pos/validate-coupon', authenticate, requireStaff, posController.validateCoupon);
router.post('/pos/return', authenticate, requireStaff, posController.processReturn);
// Additional POS routes
router.post('/pos/products/search', authenticate, requireStaff, posController.searchProducts);
router.post('/pos/orders', authenticate, requireStaff, posController.createOrder);
router.post('/pos/returns', authenticate, requireStaff, posController.processReturn);

export default router;
