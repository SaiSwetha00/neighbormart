import prisma from '../../config/database';
import { io } from '../../server';

export async function goOnline(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  const updated = await prisma.driver.update({
    where: { userId },
    data: { status: 'ONLINE', isAvailable: true },
  });

  io.to(`store:${driver.storeId}`).emit('driver-online', { driverId: driver.id });
  return updated;
}

export async function goOffline(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  const updated = await prisma.driver.update({
    where: { userId },
    data: { status: 'OFFLINE', isAvailable: false },
  });

  io.to(`store:${driver.storeId}`).emit('driver-offline', { driverId: driver.id });
  return updated;
}

export async function getTodayDeliveries(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.delivery.findMany({
    where: { driverId: driver.id, createdAt: { gte: today } },
    orderBy: { createdAt: 'asc' },
    include: {
      order: {
        include: { customer: { select: { name: true, phone: true } }, items: { include: { product: { select: { name: true } } } } },
      },
    },
  });
}

export async function updateDeliveryStatus(userId: string, deliveryId: string, status: string, data: { failureReason?: string; proofPhotoUrl?: string } = {}) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  const updateData: Record<string, unknown> = { status, ...data };
  if (status === 'PICKED_UP') updateData.pickedUpAt = new Date();
  if (status === 'DELIVERED') { updateData.deliveredAt = new Date(); }
  if (status === 'FAILED') updateData.failedAt = new Date();

  const delivery = await prisma.delivery.update({
    where: { id: deliveryId, driverId: driver.id },
    data: updateData,
  });

  if (status === 'DELIVERED') {
    await prisma.driver.update({ where: { id: driver.id }, data: { totalDeliveries: { increment: 1 } } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await (prisma.driverEarning as any).upsert({
      where: { driverId_date: { driverId: driver.id, date: today } },
      create: { driverId: driver.id, storeId: driver.storeId, date: today, deliveries: 1, baseEarning: delivery.deliveryFee * 0.8, totalEarning: delivery.deliveryFee * 0.8 },
      update: { deliveries: { increment: 1 }, baseEarning: { increment: delivery.deliveryFee * 0.8 }, totalEarning: { increment: delivery.deliveryFee * 0.8 } },
    });
  }

  io.to(`store:${driver.storeId}`).emit('order-status-update', { deliveryId, status, driverId: driver.id });
  io.to(`order:${delivery.orderId}`).emit('delivery-update', { status, deliveryId });

  return delivery;
}

export async function updateLocation(userId: string, lat: number, lng: number) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  await prisma.driver.update({
    where: { userId },
    data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
  });

  io.to(`store:${driver.storeId}`).emit('driver-location', { driverId: driver.id, lat, lng });

  const activeDelivery = await prisma.delivery.findFirst({
    where: { driverId: driver.id, status: { in: ['PICKED_UP', 'IN_TRANSIT'] } },
  });
  if (activeDelivery) {
    io.to(`order:${activeDelivery.orderId}`).emit('driver-location', { lat, lng });
  }
}

export async function getEarnings(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  return prisma.driverEarning.findMany({
    where: { driverId: driver.id },
    orderBy: { date: 'desc' },
    take: 30,
  });
}

export async function getRatings(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');

  return prisma.driverRating.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function getPerformance(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true } },
      earnings: { orderBy: { date: 'desc' }, take: 7 },
      ratings: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!driver) throw new Error('Driver profile not found');

  const totalEarned = driver.earnings.reduce((s, e) => s + e.totalEarning, 0);
  const avgRating = driver.ratings.length ? driver.ratings.reduce((s, r) => s + r.rating, 0) / driver.ratings.length : 5;

  return {
    driver: { id: driver.id, name: driver.user.name, status: driver.status, rating: driver.rating, totalDeliveries: driver.totalDeliveries },
    weeklyEarnings: driver.earnings,
    totalEarned,
    avgRating,
    recentRatings: driver.ratings,
  };
}

export async function getOrCreateDriverProfile(userId: string, storeId: string) {
  const existing = await prisma.driver.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.driver.create({
    data: { userId, storeId, status: 'OFFLINE', isAvailable: false },
  });
}
