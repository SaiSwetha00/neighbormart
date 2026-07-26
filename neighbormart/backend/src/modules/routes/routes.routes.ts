import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireManager } from '../../middleware/role.middleware';
import * as ctrl from './routes.controller';

const router = Router();

router.post('/optimize', authenticate, requireManager, ctrl.optimizeRoute);
router.get('/driver/:driverId', authenticate, requireManager, ctrl.getDriverRoutes);
router.post('/assign-batch', authenticate, requireManager, ctrl.assignBatch);

export default router;
