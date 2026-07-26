import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';

// ─── Generic global audit middleware for mutation routes ──────────────────────
export const globalAuditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
  if (!req.user) return next();

  const segments = req.path.split('/').filter(Boolean);
  const module = segments[0] ?? 'unknown';
  const action = method;

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const bodyObj = body as Record<string, unknown>;
      const recordId = (bodyObj?.data as Record<string, unknown>)?.id as string | undefined;
      prisma.auditLog.create({
        data: {
          storeId: req.user!.storeId,
          userId: req.user!.userId,
          action,
          module,
          recordId: recordId || (req.params?.id ?? null),
          newValue: req.body as object,
          ipAddress: req.ip,
        },
      }).catch(() => {});
    }
    return originalJson(body);
  };

  next();
};

export const auditLog = (module: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      if (req.user && (res.statusCode >= 200 && res.statusCode < 300)) {
        const bodyObj = body as Record<string, unknown>;
        const recordId = (bodyObj?.data as Record<string, unknown>)?.id as string | undefined;
        prisma.auditLog.create({
          data: {
            storeId: req.user.storeId,
            userId: req.user.userId,
            action,
            module,
            recordId: recordId || (req.params.id ?? null),
            newValue: req.body as object,
            ipAddress: req.ip,
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
};
