import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { sendSuccess, sendError, getPagination } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';

const COOKIE_BASE = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('customerAccessToken', accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('customerRefreshToken', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
function clearAuthCookies(res: Response) {
  res.clearCookie('customerAccessToken', COOKIE_BASE);
  res.clearCookie('customerRefreshToken', COOKIE_BASE);
}

// ─── Customer Auth ────────────────────────────────────────────────────────────

export const customerAuthController = {
  async register(req: AuthRequest, res: Response) {
    try {
      const { name, email, phone, password, storeId, referralCode } = req.body;
      const sid = storeId || req.user?.storeId;
      if (!sid) return sendError(res, 'storeId required', 400);

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return sendError(res, 'Email already registered', 409);

      const hash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { storeId: sid, name, email, phone, password: hash, role: 'CUSTOMER' },
      });
      const customer = await prisma.customer.create({
        data: { userId: user.id, storeId: sid },
      });

      // Handle referral
      if (referralCode) {
        const referrerCustomer = await prisma.customer.findFirst({
          where: { user: { email: referralCode } },
        });
        if (referrerCustomer) {
          await prisma.referral.create({
            data: { referrerId: referrerCustomer.id, referredId: customer.id, storeId: sid, pointsAwarded: 100 },
          });
          await prisma.customer.update({
            where: { id: referrerCustomer.id },
            data: { loyaltyPoints: { increment: 100 } },
          });
        }
      }

      const payload = { userId: user.id, role: user.role, storeId: sid };
      setAuthCookies(res, generateAccessToken(payload), generateRefreshToken(payload));
      return sendSuccess(res, { user: { id: user.id, name, email, role: 'CUSTOMER' }, customer }, 'Registered successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { customer: true },
      });
      if (!user || user.role !== 'CUSTOMER') return sendError(res, 'Invalid credentials', 401);
      if (user.status !== 'ACTIVE') return sendError(res, 'Account suspended', 401);

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return sendError(res, 'Invalid credentials', 401);

      await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

      const payload = { userId: user.id, role: user.role, storeId: user.storeId };
      setAuthCookies(res, generateAccessToken(payload), generateRefreshToken(payload));
      return sendSuccess(res, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        customer: user.customer,
      }, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async logout(_req: AuthRequest, res: Response) {
    clearAuthCookies(res);
    return sendSuccess(res, null, 'Logged out');
  },
};

// ─── Customer Profile ─────────────────────────────────────────────────────────

export const customerProfileController = {
  async get(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.userId },
        include: { user: { select: { name: true, email: true, phone: true, photo: true } }, addresses: true },
      });
      if (!customer) return sendError(res, 'Profile not found', 404);
      return sendSuccess(res, customer);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { name, phone, dietaryPrefs, allergenPrefs } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { ...(name && { name }), ...(phone && { phone }) },
      });
      const customer = await prisma.customer.update({
        where: { userId: req.user!.userId },
        data: {
          ...(dietaryPrefs !== undefined && { dietaryPrefs }),
          ...(allergenPrefs !== undefined && { allergenPrefs }),
        },
      });
      return sendSuccess(res, { user, customer }, 'Profile updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addressController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const addresses = await prisma.savedAddress.findMany({ where: { customerId: customer.id } });
      return sendSuccess(res, { addresses });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const { label, fullAddress, city, postalCode, lat, lng, isDefault } = req.body;
      if (isDefault) {
        await prisma.savedAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
      }
      const address = await prisma.savedAddress.create({
        data: { customerId: customer.id, label, fullAddress, city, postalCode, lat, lng, isDefault: isDefault ?? false },
      });
      return sendSuccess(res, address, 'Address added', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const { id } = req.params;
      const { label, fullAddress, city, postalCode, lat, lng, isDefault } = req.body;
      if (isDefault) {
        await prisma.savedAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
      }
      const address = await prisma.savedAddress.update({ where: { id }, data: { label, fullAddress, city, postalCode, lat, lng, isDefault } });
      return sendSuccess(res, address, 'Address updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      await prisma.savedAddress.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Address removed');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Wishlists ────────────────────────────────────────────────────────────────

export const wishlistController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const wishlists = await prisma.wishlist.findMany({
        where: { customerId: customer.id },
        include: { items: { include: { product: { select: { id: true, name: true, sellingPrice: true, images: { take: 1 } } } } } },
      });
      return sendSuccess(res, { wishlists });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const wishlist = await prisma.wishlist.create({ data: { customerId: customer.id, name: req.body.name } });
      return sendSuccess(res, wishlist, 'Wishlist created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async addItem(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.body;
      const item = await prisma.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: req.params.id, productId } },
        create: { wishlistId: req.params.id, productId },
        update: {},
      });
      return sendSuccess(res, item, 'Item added');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async removeItem(req: AuthRequest, res: Response) {
    try {
      await prisma.wishlistItem.deleteMany({ where: { wishlistId: req.params.id, productId: req.params.productId } });
      return sendSuccess(res, null, 'Item removed');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Shopping Lists ───────────────────────────────────────────────────────────

export const shoppingListController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const lists = await prisma.shoppingList.findMany({
        where: { customerId: customer.id },
        include: { items: { include: { product: { select: { id: true, name: true, sellingPrice: true } } } } },
      });
      return sendSuccess(res, { lists });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const list = await prisma.shoppingList.create({
        data: { customerId: customer.id, name: req.body.name, reminderDate: req.body.reminderDate ? new Date(req.body.reminderDate) : undefined },
      });
      return sendSuccess(res, list, 'Shopping list created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async addItem(req: AuthRequest, res: Response) {
    try {
      const { productId, quantity } = req.body;
      const item = await prisma.shoppingListItem.create({ data: { listId: req.params.id, productId, quantity: quantity ?? 1 } });
      return sendSuccess(res, item, 'Item added');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async toggleItem(req: AuthRequest, res: Response) {
    try {
      const item = await prisma.shoppingListItem.findUnique({ where: { id: req.params.itemId } });
      if (!item) return sendError(res, 'Item not found', 404);
      const updated = await prisma.shoppingListItem.update({ where: { id: req.params.itemId }, data: { isBought: !item.isBought } });
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Customer Loyalty ─────────────────────────────────────────────────────────

export const loyaltyController = {
  async get(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const transactions = await prisma.loyaltyTransaction.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return sendSuccess(res, { points: customer.loyaltyPoints, tier: customer.tier, transactions });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Owner CRM: Customer list ─────────────────────────────────────────────────

export const crmController = {
  async listCustomers(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, tier, search } = req.query;
      const p = Number(page), l = Number(limit);
      const where: any = { storeId: req.user!.storeId };
      if (tier) where.tier = tier;
      if (search) {
        where.user = { OR: [{ name: { contains: String(search) } }, { email: { contains: String(search) } }] };
      }
      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          include: { user: { select: { name: true, email: true, phone: true } } },
          skip: (p - 1) * l,
          take: l,
          orderBy: { totalSpend: 'desc' },
        }),
      ]);
      return sendSuccess(res, { customers }, 'Customers retrieved', 200, getPagination(p, l, total));
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getCustomer(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, storeId: req.user!.storeId },
        include: {
          user: { select: { name: true, email: true, phone: true, createdAt: true } },
          addresses: true,
          orders: { take: 10, orderBy: { createdAt: 'desc' } },
          loyaltyTxs: { take: 20, orderBy: { createdAt: 'desc' } },
          complaints: true,
        },
      });
      if (!customer) return sendError(res, 'Customer not found', 404);
      return sendSuccess(res, customer);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async addLoyaltyPoints(req: AuthRequest, res: Response) {
    try {
      const { points, type = 'BONUS', description } = req.body;
      const customer = await prisma.customer.update({
        where: { id: req.params.id },
        data: { loyaltyPoints: { increment: Number(points) } },
      });
      await prisma.loyaltyTransaction.create({
        data: { customerId: req.params.id, storeId: req.user!.storeId, type, points: Number(points), description },
      });
      return sendSuccess(res, { loyaltyPoints: customer.loyaltyPoints }, 'Points added');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async listComplaints(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const where: any = { storeId: req.user!.storeId };
      if (status) where.status = status;
      const complaints = await prisma.complaint.findMany({
        where,
        include: {
          customer: { include: { user: { select: { name: true, email: true } } } },
          order: { select: { id: true, total: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { complaints });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async updateComplaint(req: AuthRequest, res: Response) {
    try {
      const { status, resolutionNote } = req.body;
      const complaint = await prisma.complaint.update({
        where: { id: req.params.id },
        data: { status, resolutionNote, resolvedBy: status === 'RESOLVED' ? req.user!.userId : undefined },
      });
      return sendSuccess(res, complaint, 'Complaint updated');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async listGiftCards(req: AuthRequest, res: Response) {
    try {
      const giftCards = await prisma.giftCard.findMany({
        where: { storeId: req.user!.storeId },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { giftCards });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async createGiftCard(req: AuthRequest, res: Response) {
    try {
      const { originalValue, issuedTo, expiryDate } = req.body;
      const code = 'GC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const giftCard = await prisma.giftCard.create({
        data: {
          storeId: req.user!.storeId,
          code,
          originalValue: Number(originalValue),
          currentBalance: Number(originalValue),
          issuedTo,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        },
      });
      return sendSuccess(res, giftCard, 'Gift card created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getSegments(req: AuthRequest, res: Response) {
    try {
      const storeId = req.user!.storeId;
      const [total, silver, gold, platinum, highValue, newCustomers] = await Promise.all([
        prisma.customer.count({ where: { storeId } }),
        prisma.customer.count({ where: { storeId, tier: 'SILVER' } }),
        prisma.customer.count({ where: { storeId, tier: 'GOLD' } }),
        prisma.customer.count({ where: { storeId, tier: 'PLATINUM' } }),
        prisma.customer.count({ where: { storeId, totalSpend: { gte: 500 } } }),
        prisma.customer.count({ where: { storeId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      ]);
      return sendSuccess(res, { total, silver, gold, platinum, highValue, newCustomers });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

// ─── Customer-Facing: Product Browse ─────────────────────────────────────────

export const customerProductController = {
  async listProducts(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 24, category, search, sort = 'name', storeId } = req.query;
      const p = Number(page), l = Number(limit);
      const sid = String(storeId || req.user?.storeId || '');
      const where: any = { storeId: sid, status: 'ACTIVE' };
      if (category) where.categoryId = String(category);
      if (search) where.name = { contains: String(search) };
      const orderBy: any = sort === 'price_asc' ? { sellingPrice: 'asc' } : sort === 'price_desc' ? { sellingPrice: 'desc' } : { name: 'asc' };
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: { images: { take: 1 }, category: { select: { name: true } }, brand: { select: { name: true } } },
          skip: (p - 1) * l,
          take: l,
          orderBy,
        }),
      ]);
      return sendSuccess(res, { products }, 'Products retrieved', 200, getPagination(p, l, total));
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async getProduct(req: AuthRequest, res: Response) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          images: true,
          category: true,
          brand: true,
          nutrition: true,
          allergens: true,
          dietaryTags: true,
          variants: true,
          reviews: {
            include: { customer: { include: { user: { select: { name: true } } } } },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!product) return sendError(res, 'Product not found', 404);
      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async listCategories(req: AuthRequest, res: Response) {
    try {
      const storeId = String(req.query.storeId || req.user?.storeId || '');
      const categories = await prisma.category.findMany({ where: { storeId, parentId: null }, include: { children: true } });
      return sendSuccess(res, { categories });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async submitReview(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const { productId, orderId, rating, comment } = req.body;
      const review = await prisma.review.create({
        data: { customerId: customer.id, productId, orderId, rating: Number(rating), comment, isVerified: !!orderId },
      });
      return sendSuccess(res, review, 'Review submitted', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  async submitComplaint(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return sendError(res, 'Customer not found', 404);
      const { orderId, type, description } = req.body;
      const complaint = await prisma.complaint.create({
        data: { customerId: customer.id, storeId: customer.storeId, orderId, type, description },
      });
      return sendSuccess(res, complaint, 'Complaint submitted', 201);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};
