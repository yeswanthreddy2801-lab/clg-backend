import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Phase 13 (Admin & Moderation) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeAId: string;
  let collegeBId: string;
  let superAdminToken: string;
  let superAdminId: string;
  let collegeAdminAToken: string;
  let collegeAdminAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Create Colleges
    const colA = await prisma.college.create({ data: { name: 'College A', domain: 'cola.edu', status: 'active' } });
    collegeAId = colA.id;
    const colB = await prisma.college.create({ data: { name: 'College B', domain: 'colb.edu', status: 'active' } });
    collegeBId = colB.id;

    // Create Super Admin
    const sa = await prisma.user.create({ data: { collegeId: collegeAId, email: 'sa@global', passwordHash: 'dummy', name: 'SA', role: 'super_admin' } });
    superAdminId = sa.id;
    superAdminToken = jwtService.sign({ sub: sa.id, email: sa.email, collegeId: collegeAId, role: 'super_admin' });

    // Create College Admin A
    const caA = await prisma.user.create({ data: { collegeId: collegeAId, email: 'ca@cola', passwordHash: 'dummy', name: 'CA_A', role: 'college_admin' } });
    collegeAdminAId = caA.id;
    collegeAdminAToken = jwtService.sign({ sub: caA.id, email: caA.email, collegeId: collegeAId, role: 'college_admin' });
  });

  afterAll(async () => {
    await prisma.college.deleteMany({ where: { id: { in: [collegeAId, collegeBId] } } });
    await app.close();
  });

  describe('Super Admin (Cross-tenant Audit Logs)', () => {
    it('should capture an AuditLog when Super Admin fetches all colleges', async () => {
      // Clear logs first
      await prisma.auditLog.deleteMany({ where: { actorId: superAdminId } });

      const res = await request(app.getHttpServer())
        .get('/admin/super/colleges')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);

      // Verify AuditLog
      const logs = await prisma.auditLog.findMany({ where: { actorId: superAdminId, action: 'READ' } });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].targetType).toBe('colleges_list');
    });
  });

  describe('College Admin (Tenant Isolation)', () => {
    let dummyProjectBId: string;

    beforeAll(async () => {
      // Create a dummy pending project in College B
      const userB = await prisma.user.create({ data: { collegeId: collegeBId, email: 'dummyb@colb', passwordHash: 'd', name: 'D' }});
      const proj = await prisma.project.create({
        data: {
          collegeId: collegeBId,
          creatorId: userB.id,
          title: 'College B Project',
          description: 'Desc',
          repoUrl: 'x',
          status: 'pending'
        }
      });
      dummyProjectBId = proj.id;
    });

    it('should prevent College Admin A from approving a College B project', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/college/projects/${dummyProjectBId}/status`)
        .set('Authorization', `Bearer ${collegeAdminAToken}`)
        .send({ status: 'active' });

      // The service explicitly checks: proj.collegeId !== collegeId
      expect(res.status).toBe(404);
    });
  });
});
