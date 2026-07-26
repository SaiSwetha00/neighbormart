import prisma from '../../config/database';

export interface AuditLogQuery {
  userId?: string;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(storeId: string, query: AuditLogQuery) {
  const { userId, module, action, startDate, endDate, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId };
  if (userId) where.userId = userId;
  if (module) where.module = module;
  if (action) where.action = { contains: action };

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.createdAt = dateFilter;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, photo: true, role: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: logs.map((log) => ({
      id: log.id,
      action: log.action,
      module: log.module,
      recordId: log.recordId ?? null,
      oldValue: log.oldValue ?? null,
      newValue: log.newValue ?? null,
      ipAddress: log.ipAddress ?? null,
      createdAt: log.createdAt,
      user: log.user
        ? { id: log.user.id, name: log.user.name, photo: log.user.photo ?? null, role: log.user.role }
        : null,
    })),
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

export async function createAuditLog(data: {
  storeId?: string;
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({ data: data as any });
}

export async function getAuditModules(storeId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { storeId },
    distinct: ['module'],
    select: { module: true },
  });
  return logs.map((l) => l.module);
}
