import prisma from '../src/config/database';

async function cleanup() {
  console.log('Cleaning up test data...');

  // Delete test product
  await prisma.product.deleteMany({ where: { sku: 'TESTQA-0001' } });

  // Delete test supplier
  await prisma.supplier.deleteMany({ where: { name: { contains: 'TEST Claude QA' } } });

  // Delete test staff (user + staff record)
  const testStaff = await prisma.staff.findMany({
    where: { OR: [{ employeeId: 'EMP-002' }, { user: { name: { contains: 'TEST Claude QA' } } }] },
    include: { user: true }
  });
  for (const s of testStaff) {
    await prisma.staff.delete({ where: { id: s.id } });
    await prisma.user.delete({ where: { id: s.userId } });
  }

  // Delete test promotion
  await prisma.promotion.deleteMany({ where: { name: { contains: 'TEST Claude QA' } } }).catch(() => {});

  // Delete test delivery zone
  await prisma.deliveryZone.deleteMany({ where: { name: { contains: 'TEST Claude QA' } } }).catch(() => {});

  // Delete test customer
  await prisma.user.deleteMany({ where: { email: { contains: 'qa-customer' } } }).catch(() => {});

  console.log('Cleanup complete.');
  await prisma.$disconnect();
}

cleanup().catch(console.error);
