import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/role.middleware';
import { notificationsController } from './notifications.controller';

const router = Router();

router.get('/notifications', authenticate, notificationsController.list);
router.patch('/notifications/mark-all-read', authenticate, notificationsController.markAllRead);
router.patch('/notifications/:id/read', authenticate, notificationsController.markRead);
router.post('/notifications', authenticate, requireOwner, notificationsController.create);
router.delete('/notifications/clear-old', authenticate, requireOwner, notificationsController.deleteOld);

export default router;
