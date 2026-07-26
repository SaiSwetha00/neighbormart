import { Router } from 'express';
import { authenticate, customerAuthenticate } from '../../middleware/auth.middleware';
import { requireOwner, requireManager, requireStaff } from '../../middleware/role.middleware';
import {
  customerAuthController,
  customerProfileController,
  addressController,
  wishlistController,
  shoppingListController,
  loyaltyController,
  crmController,
  customerProductController,
  customerSelfController,
  adminCustomerController,
} from './customers.controller';

const router = Router();

// ─── Customer Auth (public) ──────────────────────────────────────────────────
router.post('/customer/auth/register', customerAuthController.register);
router.post('/customer/auth/login', customerAuthController.login);
router.post('/customer/auth/logout', customerAuthenticate, customerAuthController.logout);

// ─── Customer Profile ────────────────────────────────────────────────────────
router.get('/customer/profile', customerAuthenticate, customerProfileController.get);
router.put('/customer/profile', customerAuthenticate, customerProfileController.update);

// ─── Addresses ───────────────────────────────────────────────────────────────
router.get('/customer/addresses', customerAuthenticate, addressController.list);
router.post('/customer/addresses', customerAuthenticate, addressController.create);
router.put('/customer/addresses/:id', customerAuthenticate, addressController.update);
router.delete('/customer/addresses/:id', customerAuthenticate, addressController.remove);

// ─── Wishlists ────────────────────────────────────────────────────────────────
router.get('/customer/wishlists', customerAuthenticate, wishlistController.list);
router.post('/customer/wishlists', customerAuthenticate, wishlistController.create);
router.post('/customer/wishlists/:id/items', customerAuthenticate, wishlistController.addItem);
router.delete('/customer/wishlists/:id/items/:productId', customerAuthenticate, wishlistController.removeItem);

// ─── Shopping Lists ──────────────────────────────────────────────────────────
router.get('/customer/shopping-lists', customerAuthenticate, shoppingListController.list);
router.post('/customer/shopping-lists', customerAuthenticate, shoppingListController.create);
router.post('/customer/shopping-lists/:id/items', customerAuthenticate, shoppingListController.addItem);
router.patch('/customer/shopping-lists/:id/items/:itemId/toggle', customerAuthenticate, shoppingListController.toggleItem);

// ─── Loyalty ─────────────────────────────────────────────────────────────────
router.get('/customer/loyalty', customerAuthenticate, loyaltyController.get);
router.get('/customer/loyalty/balance', customerAuthenticate, customerSelfController.getLoyaltyBalance);

// ─── Customer Self-Service ────────────────────────────────────────────────────
router.get('/customer/search', customerSelfController.search);
router.post('/customer/cart/items', customerAuthenticate, customerSelfController.addCartItem);
router.get('/customer/orders/:id/tracking', customerAuthenticate, customerSelfController.getOrderTracking);

// ─── Customer-Facing: Browse ─────────────────────────────────────────────────
router.get('/customer/products', customerProductController.listProducts);
router.get('/customer/products/:id', customerProductController.getProduct);
router.get('/customer/categories', customerProductController.listCategories);
router.post('/customer/reviews', customerAuthenticate, customerProductController.submitReview);
router.post('/customer/complaints', customerAuthenticate, customerProductController.submitComplaint);
router.post('/customer/driver-ratings', customerAuthenticate, customerProductController.rateDriver);

// ─── Admin Customer Routes ────────────────────────────────────────────────────
router.get('/customers', authenticate, requireManager, adminCustomerController.listAll);
router.get('/customers/segments', authenticate, requireManager, adminCustomerController.getSegments);
router.get('/loyalty/tiers', authenticate, adminCustomerController.getLoyaltyTiers);

// ─── Owner CRM ───────────────────────────────────────────────────────────────
router.get('/crm/customers', authenticate, requireOwner, crmController.listCustomers);
router.get('/crm/customers/:id', authenticate, requireOwner, crmController.getCustomer);
router.post('/crm/customers/:id/loyalty', authenticate, requireOwner, crmController.addLoyaltyPoints);
router.get('/crm/segments', authenticate, requireOwner, crmController.getSegments);
router.get('/crm/complaints', authenticate, requireManager, crmController.listComplaints);
router.patch('/crm/complaints/:id', authenticate, requireManager, crmController.updateComplaint);
router.get('/crm/gift-cards', authenticate, requireOwner, crmController.listGiftCards);
router.post('/crm/gift-cards', authenticate, requireOwner, crmController.createGiftCard);

export default router;
