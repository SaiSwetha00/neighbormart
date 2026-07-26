import { Router } from 'express';
import * as searchController from './search.controller';

const router = Router();

router.post('/search/visual', searchController.visualSearch);
router.get('/search/smart', searchController.smartSearch);
router.get('/products/recommendations/:customerId', searchController.getRecommendations);

export default router;
