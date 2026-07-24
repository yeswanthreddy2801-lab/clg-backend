import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { SearchService } from '../src/modules/search/search.service';
import { NotificationConsumerService } from '../src/modules/notifications/notifications.consumer.service';

describe('Phase 11 (Search & Notifications) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;
  let searchService: SearchService;
  let notificationConsumerService: any;

  let collegeAId: string;
  let collegeBId: string;
  let userAId: string;
  let userAToken: string;
  let userBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    searchService = moduleFixture.get<SearchService>(SearchService);
    notificationConsumerService = moduleFixture.get<NotificationConsumerService>(NotificationConsumerService);
    await app.init();

    // Create Colleges
    const colA = await prisma.college.create({ data: { name: 'College A', domain: 'cola.edu', status: 'active' } });
    collegeAId = colA.id;

    const colB = await prisma.college.create({ data: { name: 'College B', domain: 'colb.edu', status: 'active' } });
    collegeBId = colB.id;

    // Create Users
    const userA = await prisma.user.create({ data: { collegeId: collegeAId, email: 'a@cola.edu', passwordHash: 'dummy', name: 'User A' } });
    userAId = userA.id;
    userAToken = jwtService.sign({ sub: userA.id, email: userA.email, collegeId: collegeAId, role: 'student' });

    const userB = await prisma.user.create({ data: { collegeId: collegeAId, email: 'b@cola.edu', passwordHash: 'dummy', name: 'User B' } });
    userBId = userB.id;

    // Initialize their UserSettings
    await prisma.userSettings.create({
      data: {
        userId: userBId,
        notifyEvents: false, // Disabling event notifications for User B
      }
    });

  });

  afterAll(async () => {
    await prisma.college.deleteMany({ where: { id: { in: [collegeAId, collegeBId] } } });
    await app.close();
  });

  describe('Notifications (Category Toggles)', () => {
    it('should NOT create an event notification if notifyEvents is false', async () => {
      // Manually trigger the consumer handler directly for testing logic
      await notificationConsumerService.handleNotificationEvent({
        actorId: userAId,
        targetUserId: userBId,
        type: 'event',
        targetType: 'event',
        targetId: 'dummy-event-id'
      });

      // Verify DB has 0 notifications for user B
      const count = await prisma.notification.count({
        where: { userId: userBId, type: 'event' }
      });
      expect(count).toBe(0);
    });

    it('should create a like notification if notifyLikes is true (default)', async () => {
      await notificationConsumerService.handleNotificationEvent({
        actorId: userAId,
        targetUserId: userBId,
        type: 'like',
        targetType: 'post',
        targetId: 'dummy-post-id'
      });

      const count = await prisma.notification.count({
        where: { userId: userBId, type: 'like' }
      });
      expect(count).toBe(1);
    });
  });

  describe('Search (Tenant Isolation)', () => {
    it('should strictly filter OpenSearch results by collegeId', async () => {
      // Mock OpenSearch response to pretend we got hits from both colleges
      jest.spyOn((searchService as any).osClient, 'search').mockResolvedValue({
        body: {
          hits: {
            hits: [
              { _index: 'college_users', _id: '1', _source: { name: 'John Doe', collegeId: collegeAId } },
              { _index: 'college_users', _id: '2', _source: { name: 'John Doe', collegeId: collegeBId } }
            ]
          }
        }
      });

      const query = {
        bool: {
          must: [ { multi_match: { query: 'John', fields: ['*'], fuzziness: 'AUTO' } } ],
          filter: [ { term: { collegeId: collegeAId } } ] // This is the crucial check!
        }
      };

      await searchService.search(collegeAId, { q: 'John', type: 'users' });
      
      // Verify that the osClient was called with the STRICT collegeId filter
      expect((searchService as any).osClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                filter: [ { term: { collegeId: collegeAId } } ]
              })
            })
          })
        })
      );
    });
  });
});
