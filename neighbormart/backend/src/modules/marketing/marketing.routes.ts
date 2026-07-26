import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/role.middleware';
import { marketingController } from './marketing.controller';

const router = Router();

router.get('/campaigns', authenticate, requireOwner, marketingController.getCampaigns);
router.post('/campaigns', authenticate, requireOwner, marketingController.createCampaign);
router.put('/campaigns/:id', authenticate, requireOwner, marketingController.updateCampaign);
router.delete('/campaigns/:id', authenticate, requireOwner, marketingController.deleteCampaign);
router.post('/campaigns/:id/launch', authenticate, requireOwner, marketingController.launchCampaign);
router.get('/campaigns/:id/analytics', authenticate, requireOwner, marketingController.getCampaignAnalytics);
router.get('/ab-tests', authenticate, requireOwner, marketingController.getABTests);
router.post('/ab-tests', authenticate, requireOwner, marketingController.createABTest);
router.get('/referrals/stats', authenticate, requireOwner, marketingController.getReferralStats);

export default router;
