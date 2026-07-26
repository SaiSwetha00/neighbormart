import 'dotenv/config';
import prisma from '../config/database';

async function main() {
  // Find DELIVERY type PENDING orders without a Delivery record
  const deliveryOrders = await prisma.order.findMany({
    where: { type: 'DELIVERY', storeId: 'demo-store-001' },
    include: { delivery: true },
    take: 5,
  });

  let created = 0;
  for (const order of deliveryOrders) {
    if (!order.delivery) {
      await prisma.delivery.create({
        data: {
          orderId: order.id,
          storeId: order.storeId,
          status: order.status === 'DELIVERED' ? 'DELIVERED' : order.status === 'CANCELLED' ? 'FAILED' : 'PENDING',
          deliveryFee: 45,
          addressText: '456 Test Street, Bangalore',
          addressLat: 12.9800,
          addressLng: 77.6000,
        },
      });
      created++;
      console.log(`Created delivery for order ${order.id} (${order.status})`);
    } else {
      console.log(`Order ${order.id} already has delivery record`);
    }
  }
  console.log(`Created ${created} delivery records`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
