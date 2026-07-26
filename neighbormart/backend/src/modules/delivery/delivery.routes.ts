import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import * as ctrl from './delivery.controller';

const router = Router();

router.get('/dashboard', authenticate, requireManager, ctrl.getDashboard);
router.get('/orders', authenticate, requireManager, ctrl.getOrders);
router.post('/assign', authenticate, requireManager, ctrl.assignDriver);
router.get('/zones', authenticate, requireManager, ctrl.getZones);
router.post('/zones', authenticate, requireManager, ctrl.createZone);
router.put('/zones/:id', authenticate, requireManager, ctrl.updateZone);
router.delete('/zones/:id', authenticate, requireOwner, ctrl.deleteZone);
router.get('/slots', authenticate, requireManager, ctrl.getSlots);
router.post('/slots', authenticate, requireManager, ctrl.createSlot);
router.put('/slots/:id', authenticate, requireManager, ctrl.updateSlot);
router.delete('/slots/:id', authenticate, requireOwner, ctrl.deleteSlot);
router.get('/live', authenticate, requireManager, ctrl.getLive);
router.get('/tracking/:orderId', authenticate, ctrl.getTracking);
router.get('/performance', authenticate, requireManager, ctrl.getPerformance);

export default router;
