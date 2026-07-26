import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminController } from './admin.controller';

const router = Router();

const requireSuperAdmin = requireRole('SUPER_ADMIN', 'OWNER');

router.get('/admin/stores', authenticate, requireSuperAdmin, adminController.getAllStores);
router.patch('/admin/stores/:id/status', authenticate, requireSuperAdmin, adminController.updateStoreStatus);
router.get('/admin/users', authenticate, requireSuperAdmin, adminController.getAllUsers);
router.get('/admin/revenue', authenticate, requireSuperAdmin, adminController.getPlatformRevenue);
router.get('/admin/ai-usage', authenticate, requireSuperAdmin, adminController.getAIUsage);
router.get('/admin/settings', authenticate, requireSuperAdmin, adminController.getPlatformSettings);
router.get('/admin/gdpr/export/:userId', authenticate, requireSuperAdmin, adminController.exportUserData);
router.delete('/admin/gdpr/delete/:userId', authenticate, requireSuperAdmin, adminController.softDeleteUser);

export default router;
