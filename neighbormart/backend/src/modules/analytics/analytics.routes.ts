import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import * as analyticsController from './analytics.controller';

const router = Router();

router.get('/reports', authenticate, requireOwner, analyticsController.listReports);
router.post('/reports', authenticate, requireOwner, analyticsController.createReport);
router.get('/reports/:id/run', authenticate, requireOwner, analyticsController.runReport);
router.post('/ai/report-summary', authenticate, requireOwner, analyticsController.getReportAISummary);
router.get('/analytics/product-performance', authenticate, requireManager, analyticsController.getProductPerformance);
router.get('/analytics/customer-behavior', authenticate, requireOwner, analyticsController.getCustomerBehavior);

export default router;
