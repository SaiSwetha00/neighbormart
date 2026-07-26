import 'dotenv/config';
import prisma from '../config/database';
async function main() {
  // Get the driver
  const driver = await prisma.driver.findFirst({ where: { storeId: 'demo-store-001' } });
  console.log('Driver:', driver?.id);

  // Reset 2 deliveries to PENDING for testing
  const toReset = [
    'cms1cbpuu0009id3gbf6tm2pg',
    'cms1cbpuh0007id3gxuj5a4yy',
  ];
  
  for (const id of toReset) {
    await prisma.delivery.update({
      where: { id },
      data: {
        status: 'PENDING',
        driverId: null,
        deliveredAt: null,
        pickedUpAt: null,
        failedAt: null,
        failureReason: null,
        proofPhotoUrl: null,
      },
    });
    console.log('Reset delivery:', id, '-> PENDING');
  }
}
main().then(() => prisma.$disconnect()).catch((e: Error) => { console.error(e.message); process.exit(1); });
