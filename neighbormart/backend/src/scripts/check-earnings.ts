import 'dotenv/config';
import prisma from '../config/database';
async function main() {
  const driver = await prisma.driver.findFirst({ where: { storeId: 'demo-store-001' } });
  console.log('Driver:', driver?.id);
  
  const earnings = await prisma.driverEarning.findMany({ where: { driverId: driver!.id } });
  console.log('Earnings count:', earnings.length);
  earnings.forEach(e => console.log('  date:', e.date, 'type:', typeof e.date, 'deliveries:', e.deliveries));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  console.log('Today:', today.toISOString(), 'Tomorrow:', tomorrow.toISOString());
  
  const found = await prisma.driverEarning.findFirst({
    where: { driverId: driver!.id, date: { gte: today, lt: tomorrow } },
  });
  console.log('Found with range query:', found?.id || 'NULL');
  
  const foundExact = await prisma.driverEarning.findFirst({ where: { driverId: driver!.id } });
  console.log('Found any:', foundExact?.id, 'date:', foundExact?.date?.toISOString());
}
main().then(() => prisma.$disconnect()).catch((e: Error) => { console.error(e.message); process.exit(1); });
