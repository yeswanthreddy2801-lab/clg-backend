import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Phase 8 (News, Events, Clubs) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeId: string;
  let normalUserId: string;
  let normalUserToken: string;
  let pendingClubId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Setup Test Data
    const college = await prisma.college.create({
      data: { name: 'Phase 8 Test College', domain: 'phase8.edu', status: 'active' },
    });
    collegeId = college.id;

    const normalUser = await prisma.user.create({
      data: {
        collegeId,
        email: 'student@phase8.edu',
        passwordHash: 'dummy',
        name: 'Normal Student',
        role: 'student',
      }
    });
    normalUserId = normalUser.id;
    normalUserToken = jwtService.sign({ sub: normalUser.id, email: normalUser.email, collegeId, role: normalUser.role });

    // Create a pending club manually
    const club = await prisma.club.create({
      data: {
        collegeId,
        name: 'Test Club',
        description: 'Testing pending status',
        status: 'pending',
      }
    });
    pendingClubId = club.id;
  });

  afterAll(async () => {
    await prisma.college.delete({ where: { id: collegeId } });
    await app.close();
  });

  it('should deny POST /news to a standard student (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/news')
      .set('Authorization', `Bearer ${normalUserToken}`)
      .send({
        title: 'Hacked News',
        content: 'I am not an admin',
        category: 'announcements'
      });
    
    expect(res.status).toBe(403);
  });

  it('should deny POST /events to a standard student (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${normalUserToken}`)
      .send({
        title: 'Fake Event',
        category: 'party',
        description: 'Should fail',
        venue: 'Somewhere',
        startsAt: new Date().toISOString()
      });
    
    expect(res.status).toBe(403);
  });

  it('should not return a pending club in GET /clubs', async () => {
    const res = await request(app.getHttpServer())
      .get('/clubs')
      .set('Authorization', `Bearer ${normalUserToken}`);
    
    expect(res.status).toBe(200);
    // The pending club should not be in the list
    const found = res.body.find((c: any) => c.id === pendingClubId);
    expect(found).toBeUndefined();
  });
});
