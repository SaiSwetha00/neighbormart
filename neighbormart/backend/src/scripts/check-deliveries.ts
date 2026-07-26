import 'dotenv/config';
import prisma from '../config/database';
async function main() {
  const all = await prisma.delivery.findMany({ 
    where: { storeId: 'demo-store-001' }, 
    select: { id: true, status: true, orderId: true, driverId: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Total deliveries:', all.length);
  for (const d of all) {
    console.log(`  ${d.id} | ${d.status} | driver:${d.driverId || 'none'}`);
  }
}
main().then(() => prisma.$disconnect()).catch((e: Error) => { console.error(e.message); process.exit(1); });
