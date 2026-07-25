import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireManager } from '../../middleware/role.middleware';
import { salesController } from './sales.controller';

const router = Router();

router.get('/sales/overview', authenticate, requireManager, salesController.overview);
router.get('/sales/transactions', authenticate, requireManager, salesController.transactions);
router.get('/sales/by-product', authenticate, requireManager, salesController.byProduct);
router.get('/sales/staff-performance', authenticate, requireManager, salesController.staffPerformance);

export default router;
