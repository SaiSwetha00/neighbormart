import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/role.middleware';
import { promotionsController } from './promotions.controller';

const router = Router();

// Promotions
router.get('/promotions', authenticate, requireOwner, promotionsController.list);
router.get('/promotions/performance', authenticate, requireOwner, promotionsController.getPerformance);
router.post('/promotions', authenticate, requireOwner, promotionsController.create);
router.put('/promotions/:id', authenticate, requireOwner, promotionsController.update);
router.delete('/promotions/:id', authenticate, requireOwner, promotionsController.remove);

// Coupons
router.get('/coupons', authenticate, requireOwner, promotionsController.listCoupons);
router.post('/coupons', authenticate, requireOwner, promotionsController.createCoupon);
router.post('/coupons/bulk-generate', authenticate, requireOwner, promotionsController.bulkGenerateCoupons);
router.put('/coupons/:id', authenticate, requireOwner, promotionsController.updateCoupon);
router.delete('/coupons/:id', authenticate, requireOwner, promotionsController.deleteCoupon);

export default router;
