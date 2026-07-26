import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import productRoutes from './modules/products/products.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import supplierRoutes from './modules/suppliers/suppliers.routes';
import staffRoutes from './modules/staff/staff.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import auditRoutes from './modules/audit/audit.routes';
import customerRoutes from './modules/customers/customers.routes';
import orderRoutes from './modules/orders/orders.routes';
import posRoutes from './modules/pos/pos.routes';
import salesRoutes from './modules/sales/sales.routes';
import financeRoutes from './modules/finance/finance.routes';
import promotionsRoutes from './modules/promotions/promotions.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import aiRoutes from './modules/ai/ai.routes';
import searchRoutes from './modules/search/search.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app = express();

// ─── Security middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// ─── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ─── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression() as express.RequestHandler);

// ─── HTTP request logging ───────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', supplierRoutes);
app.use('/api', staffRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', auditRoutes);
app.use('/api', customerRoutes);
app.use('/api', orderRoutes);
app.use('/api', posRoutes);
app.use('/api', salesRoutes);
app.use('/api', financeRoutes);
app.use('/api', promotionsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', aiRoutes);
app.use('/api', searchRoutes);
app.use('/api', analyticsRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
