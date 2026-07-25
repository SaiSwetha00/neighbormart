import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager } from '../../middleware/role.middleware';
import { financeController } from './finance.controller';

const router = Router();

// Expenses
router.get('/finance/expenses', authenticate, requireManager, financeController.listExpenses);
router.post('/finance/expenses', authenticate, requireManager, financeController.createExpense);
router.patch('/finance/expenses/:id/approve', authenticate, requireOwner, financeController.approveExpense);
router.delete('/finance/expenses/:id', authenticate, requireOwner, financeController.deleteExpense);

// Tax configs
router.get('/finance/tax-configs', authenticate, requireOwner, financeController.listTaxConfigs);
router.post('/finance/tax-configs', authenticate, requireOwner, financeController.createTaxConfig);
router.put('/finance/tax-configs/:id', authenticate, requireOwner, financeController.updateTaxConfig);

// P&L and forecast
router.get('/finance/pl', authenticate, requireOwner, financeController.getPL);
router.get('/finance/forecast', authenticate, requireOwner, financeController.getForecast);

export default router;
