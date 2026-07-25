import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { SpamDetectionProcessor } from '../src/modules/moderation/spam.processor';

describe('Phase 14 (Recommendations & Advanced Moderation) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let spamProcessor: SpamDetectionProcessor;
  
  let spammerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    spamProcessor = moduleFixture.get<SpamDetectionProcessor>(SpamDetectionProcessor);
    await app.init();

    // Setup college
    const college = await prisma.college.create({ data: { name: 'P14', domain: 'p14', status: 'active' } });

    // Setup spammer
    const spammer = await prisma.user.create({
      data: { collegeId: college.id, email: 'spam@bot', passwordHash: 'dummy', name: 'Spammer Bot', role: 'student' }
    });
    spammerId = spammer.id;

    // Simulate 150 followings, 0 followers
    const dummyFollowing = [];
    for (let i = 0; i < 150; i++) {
      const u = await prisma.user.create({ data: { collegeId: college.id, email: `dummy${i}@bot`, passwordHash: 'd', name: 'd' }});
      dummyFollowing.push({ followerId: spammerId, followingId: u.id });
    }
    await prisma.follow.createMany({ data: dummyFollowing });

    // Create an automod
    await prisma.user.create({ data: { collegeId: college.id, email: 'automod@campusverse.local', passwordHash: 'd', name: 'AM', role: 'super_admin' }});
  });

  afterAll(async () => {
    // Teardown
    await prisma.follow.deleteMany({ where: { followerId: spammerId } });
    await prisma.user.deleteMany({ where: { email: { contains: '@bot' } } });
    await prisma.user.deleteMany({ where: { email: 'automod@campusverse.local' } });
    await prisma.college.deleteMany({ where: { domain: 'p14' } });
    await app.close();
  });

  describe('SpamDetectionProcessor', () => {
    it('should flag a user with suspicious follow/follower ratio', async () => {
      // Run processor job directly for testing
      await spamProcessor.process({ name: 'scan-accounts' } as any);

      // Verify report was created
      const reports = await prisma.report.findMany({
        where: { targetType: 'user', targetId: spammerId }
      });
      
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].reason).toContain('Spam heuristics triggered');
      expect(reports[0].status).toBe('escalated');
    }, 10000);
  });
});
