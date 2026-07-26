import prisma from '../../config/database';

interface LatLng { lat: number; lng: number; label?: string; deliveryId?: string }

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Nearest-neighbour TSP heuristic
function nearestNeighbour(origin: LatLng, stops: LatLng[]): LatLng[] {
  const remaining = [...stops];
  const route: LatLng[] = [];
  let current = origin;

  while (remaining.length) {
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    }
    route.push(remaining[nearest]);
    current = remaining[nearest];
    remaining.splice(nearest, 1);
  }

  return route;
}

export async function optimizeRoute(storeId: string, driverId: string, deliveryIds: string[]) {
  const deliveries = await prisma.delivery.findMany({
    where: { id: { in: deliveryIds }, storeId },
    include: { order: { include: { customer: { select: { name: true } } } } },
  });

  const store = await prisma.store.findUnique({ where: { id: storeId } });

  const origin: LatLng = { lat: 12.9716, lng: 77.5946, label: 'Store' }; // default coords

  const stops: LatLng[] = deliveries
    .filter(d => d.addressLat && d.addressLng)
    .map(d => ({ lat: d.addressLat!, lng: d.addressLng!, label: d.order.customer?.name || d.id, deliveryId: d.id }));

  const optimized = nearestNeighbour(origin, stops);

  let totalDist = 0;
  let prev = origin;
  for (const stop of optimized) {
    totalDist += haversineKm(prev, stop);
    prev = stop;
  }

  const estMins = Math.round(totalDist * 4 + optimized.length * 5);

  const route = await prisma.route.create({
    data: {
      storeId,
      driverId,
      status: 'OPTIMIZED',
      stopCount: optimized.length,
      totalDistKm: Math.round(totalDist * 10) / 10,
      estDurationMins: estMins,
      waypointsJson: { origin, stops: optimized },
      optimizedAt: new Date(),
    },
  });

  return { route, optimized, totalDistKm: route.totalDistKm, estDurationMins: estMins };
}

export async function getDriverRoutes(driverId: string) {
  return prisma.route.findMany({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export async function assignBatch(storeId: string, driverId: string, deliveryIds: string[]) {
  await prisma.delivery.updateMany({
    where: { id: { in: deliveryIds }, storeId },
    data: { driverId, status: 'ASSIGNED' },
  });

  return optimizeRoute(storeId, driverId, deliveryIds);
}
