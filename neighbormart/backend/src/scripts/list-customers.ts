import 'dotenv/config';
import prisma from '../config/database';
async function main() {
  const customers = await prisma.customer.findMany({ 
    include: { user: { select: { email: true, role: true } } }, 
    take: 5 
  });
  customers.forEach(c => console.log(c.user.email, 'role:', c.user.role, 'storeId:', c.storeId));
}
main().then(() => prisma.$disconnect()).catch((e: Error) => { console.error(e.message); process.exit(1); });
