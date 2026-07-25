import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/role.middleware';
import { getAll } from './audit.controller';

const router = Router();

/**
 * @route  GET /api/audit-logs
 * @access Owner only
 * @query  userId, module, action, startDate, endDate, page, limit
 */
router.get('/audit-logs', authenticate, requireOwner, getAll);

export default router;
