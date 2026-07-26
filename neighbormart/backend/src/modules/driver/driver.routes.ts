import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as ctrl from './driver.controller';

const router = Router();

const requireDriver = requireRole('DRIVER');

router.post('/go-online', authenticate, requireDriver, ctrl.goOnline);
router.post('/go-offline', authenticate, requireDriver, ctrl.goOffline);
router.get('/deliveries/today', authenticate, requireDriver, ctrl.getTodayDeliveries);
router.post('/deliveries/:id/accept', authenticate, requireDriver, ctrl.acceptDelivery);
router.post('/deliveries/:id/reject', authenticate, requireDriver, ctrl.rejectDelivery);
router.post('/deliveries/:id/picked-up', authenticate, requireDriver, ctrl.pickedUp);
router.post('/deliveries/:id/delivered', authenticate, requireDriver, ctrl.delivered);
router.post('/deliveries/:id/failed', authenticate, requireDriver, ctrl.failed);
router.post('/location', authenticate, requireDriver, ctrl.updateLocation);
router.get('/earnings', authenticate, requireDriver, ctrl.getEarnings);
router.get('/ratings', authenticate, requireDriver, ctrl.getRatings);
router.get('/performance', authenticate, requireDriver, ctrl.getPerformance);

export default router;
