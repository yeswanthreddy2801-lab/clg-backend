require('dotenv').config({ path: '../../.env' });
import { prismaClient as prisma } from './src/prisma/client';

async function main() {
  console.log('Seeding ANITS...');
  const college = await prisma.college.upsert({
    where: { domain: 'anits.edu.in' },
    update: {},
    create: {
      name: 'Anil Neerukonda Institute of Technology and Sciences',
      domain: 'anits.edu.in',
      city: 'Visakhapatnam',
      studentCount: 5000,
      status: 'active',
      logoUrl: 'https://www.anits.edu.in/images/anits_logo.png'
    }
  });
  console.log('College seeded:', college.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
