import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Phase 10 (Users, Follows, Blocks) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeId: string;
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Setup Test Data
    const college = await prisma.college.create({
      data: { name: 'Phase 10 College', domain: 'phase10.edu', status: 'active' },
    });
    collegeId = college.id;

    const userA = await prisma.user.create({
      data: { collegeId, email: 'usera@phase10.edu', passwordHash: 'dummy', name: 'User A' }
    });
    userAId = userA.id;
    userAToken = jwtService.sign({ sub: userA.id, email: userA.email, collegeId, role: 'student' });

    const userB = await prisma.user.create({
      data: { collegeId, email: 'userb@phase10.edu', passwordHash: 'dummy', name: 'User B' }
    });
    userBId = userB.id;
    userBToken = jwtService.sign({ sub: userB.id, email: userB.email, collegeId, role: 'student' });
  });

  afterAll(async () => {
    await prisma.college.delete({ where: { id: collegeId } });
    await app.close();
  });

  it('should successfully allow User A to follow User B', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(201);
  });

  it('should allow User B to block User A', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${userAId}/block`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(201);
  });

  it('should prevent User A from following User B after being blocked', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${userAToken}`);
    // Block should throw a 403 Forbidden
    expect(res.status).toBe(403);
  });

  it('should prevent User A from viewing User B profile after block', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${userBId}/profile`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(403);
  });
});
