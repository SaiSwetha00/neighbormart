import prisma from '../../config/database';
import { io } from '../../server';

export async function getDashboardStats(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalDeliveries, pending, inTransit, delivered, failed, drivers] = await Promise.all([
    prisma.delivery.count({ where: { storeId } }),
    prisma.delivery.count({ where: { storeId, status: 'PENDING' } }),
    prisma.delivery.count({ where: { storeId, status: 'IN_TRANSIT' } }),
    prisma.delivery.count({ where: { storeId, status: 'DELIVERED', deliveredAt: { gte: today } } }),
    prisma.delivery.count({ where: { storeId, status: 'FAILED', failedAt: { gte: today } } }),
    prisma.driver.findMany({
      where: { storeId },
      select: { id: true, status: true, currentLat: true, currentLng: true, rating: true, user: { select: { name: true } } },
    }),
  ]);

  const onlineDrivers = drivers.filter(d => d.status !== 'OFFLINE').length;

  return { totalDeliveries, pending, inTransit, delivered, failed, onlineDrivers, totalDrivers: drivers.length, drivers };
}

export async function getDeliveryOrders(storeId: string, status?: string) {
  const where: Record<string, unknown> = { storeId };
  if (status) where.status = status;

  return prisma.delivery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: { select: { id: true, total: true, customer: { select: { name: true, phone: true } } } },
      driver: { select: { id: true, user: { select: { name: true, phone: true } } } },
      slot: { select: { startTime: true, endTime: true } },
    },
  });
}

export async function assignDriver(deliveryId: string, driverId: string, storeId: string) {
  const delivery = await prisma.delivery.update({
    where: { id: deliveryId, storeId },
    data: { driverId, status: 'ASSIGNED' },
    include: { order: true, driver: { include: { user: true } } },
  });

  io.to(`store:${storeId}`).emit('delivery-assigned', { deliveryId, driverId });
  io.to(`driver:${driverId}`).emit('new-delivery', delivery);

  return delivery;
}

export async function getZones(storeId: string) {
  return prisma.deliveryZone.findMany({ where: { storeId }, include: { slots: true } });
}

export async function createZone(storeId: string, data: { name: string; description?: string; polygonJson: object; baseFee: number; perKmFee: number; maxDistance: number }) {
  return prisma.deliveryZone.create({ data: { storeId, ...data } });
}

export async function updateZone(id: string, storeId: string, data: Partial<{ name: string; description: string; baseFee: number; perKmFee: number; maxDistance: number; isActive: boolean }>) {
  return prisma.deliveryZone.update({ where: { id }, data });
}

export async function deleteZone(id: string) {
  return prisma.deliveryZone.delete({ where: { id } });
}

export async function getSlots(storeId: string) {
  return prisma.deliverySlot.findMany({ where: { storeId }, include: { zone: true } });
}

export async function createSlot(storeId: string, data: { zoneId: string; dayOfWeek: number; startTime: string; endTime: string; maxOrders: number }) {
  return prisma.deliverySlot.create({ data: { storeId, ...data } });
}

export async function updateSlot(id: string, data: Partial<{ startTime: string; endTime: string; maxOrders: number; isActive: boolean }>) {
  return prisma.deliverySlot.update({ where: { id }, data });
}

export async function deleteSlot(id: string) {
  return prisma.deliverySlot.delete({ where: { id } });
}

export async function getLiveDeliveries(storeId: string) {
  return prisma.delivery.findMany({
    where: { storeId, status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
    include: {
      driver: { select: { currentLat: true, currentLng: true, user: { select: { name: true } } } },
      order: { select: { total: true, customer: { select: { name: true } } } },
    },
  });
}

export async function getOrderTracking(orderId: string) {
  return prisma.delivery.findUnique({
    where: { orderId },
    include: {
      driver: { select: { currentLat: true, currentLng: true, user: { select: { name: true, phone: true } } } },
      order: { include: { tracking: { orderBy: { createdAt: 'asc' } } } },
    },
  });
}

export async function getDriverPerformance(storeId: string) {
  const drivers = await prisma.driver.findMany({
    where: { storeId },
    include: {
      user: { select: { name: true } },
      earnings: { orderBy: { date: 'desc' }, take: 30 },
      ratings: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  return drivers.map(d => ({
    id: d.id,
    name: d.user.name,
    status: d.status,
    rating: d.rating,
    totalDeliveries: d.totalDeliveries,
    recentEarnings: d.earnings.slice(0, 7).reduce((s, e) => s + e.totalEarning, 0),
    recentRatings: d.ratings,
  }));
}
