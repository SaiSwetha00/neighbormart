import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/role.middleware';
import * as aiController from './ai.controller';

const router = Router();

router.post('/ai/chat', authenticate, aiController.chatHandler);
router.get('/ai/conversation', authenticate, aiController.getConversation);
router.delete('/ai/conversation', authenticate, aiController.clearConversation);
router.get('/ai/insights', authenticate, aiController.getInsights);
router.post('/ai/insights/:id/act', authenticate, aiController.actOnInsight);
router.post('/ai/insights/:id/dismiss', authenticate, aiController.dismissInsight);
router.get('/ai/dashboard', authenticate, requireOwner, aiController.getAIDashboard);
router.get('/ai/panel-insight/:module', authenticate, aiController.getPanelInsight);

export default router;
