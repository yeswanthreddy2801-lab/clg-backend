import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create mock colleges
  const college1 = await prisma.college.upsert({
    where: { domain: 'mock1.edu' },
    update: {},
    create: {
      name: 'Mock College 1',
      domain: 'mock1.edu',
      city: 'City A',
      status: 'active',
      studentCount: 1500,
    },
  });

  const college2 = await prisma.college.upsert({
    where: { domain: 'mock2.edu' },
    update: {},
    create: {
      name: 'Mock College 2',
      domain: 'mock2.edu',
      city: 'City B',
      status: 'active',
      studentCount: 2000,
    },
  });

  const college3 = await prisma.college.upsert({
    where: { domain: 'mock3.edu' },
    update: {},
    create: {
      name: 'Mock College 3',
      domain: 'mock3.edu',
      city: 'City C',
      status: 'active',
      studentCount: 500,
    },
  });

  const colleges = [college1, college2, college3];

  // Create mock users
  for (let i = 1; i <= 20; i++) {
    const collegeIndex = i % 3;
    const role = i === 1 ? 'super_admin' : i === 2 ? 'college_admin' : i === 3 ? 'club_admin' : 'student';

    await prisma.user.upsert({
      where: { email: `user${i}@${colleges[collegeIndex].domain}` },
      update: {},
      create: {
        email: `user${i}@${colleges[collegeIndex].domain}`,
        name: `User ${i}`,
        passwordHash: 'mock-hash', // To be updated with real hash in Phase 2
        collegeId: colleges[collegeIndex].id,
        role: role,
        isVerified: true,
      },
    });
  }

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
