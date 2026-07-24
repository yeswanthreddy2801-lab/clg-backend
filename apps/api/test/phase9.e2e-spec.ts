import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Phase 9 (Marketplace, Placements, Lost&Found) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeId: string;
  let studentId: string;
  let studentToken: string;
  let anonymousExpId: string;
  let publicExpId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Setup Test Data
    const college = await prisma.college.create({
      data: { name: 'Phase 9 Test College', domain: 'phase9.edu', status: 'active' },
    });
    collegeId = college.id;

    const student = await prisma.user.create({
      data: {
        collegeId,
        email: 'anon@phase9.edu',
        passwordHash: 'dummy',
        name: 'Real Name Student',
        role: 'student',
      }
    });
    studentId = student.id;
    studentToken = jwtService.sign({ sub: student.id, email: student.email, collegeId, role: student.role });
  });

  afterAll(async () => {
    await prisma.college.delete({ where: { id: collegeId } });
    await app.close();
  });

  it('should post an anonymous placement experience', async () => {
    const res = await request(app.getHttpServer())
      .post('/placements/experiences')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        company: 'Google',
        role: 'SWE',
        verdict: 'selected',
        roundsJson: [{ round: 1, notes: 'Coding' }],
        isAnonymous: true
      });
    
    expect(res.status).toBe(201);
    anonymousExpId = res.body.id;
  });

  it('should post a public placement experience', async () => {
    const res = await request(app.getHttpServer())
      .post('/placements/experiences')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        company: 'Microsoft',
        role: 'SWE',
        verdict: 'selected',
        roundsJson: [{ round: 1, notes: 'Design' }],
        isAnonymous: false
      });
    
    expect(res.status).toBe(201);
    publicExpId = res.body.id;
  });

  it('should strip author data for anonymous experiences but keep it for public ones', async () => {
    const res = await request(app.getHttpServer())
      .get('/placements/experiences')
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(res.status).toBe(200);
    
    const anonExp = res.body.find((e: any) => e.id === anonymousExpId);
    const pubExp = res.body.find((e: any) => e.id === publicExpId);

    expect(anonExp).toBeDefined();
    expect(pubExp).toBeDefined();

    // Verify anonymity is enforced by the server
    expect(anonExp.author.name).toBe('Anonymous Student');
    expect(anonExp.author.id).toBeUndefined(); // ID should be stripped

    // Verify public is not stripped
    expect(pubExp.author.name).toBe('Real Name Student');
    expect(pubExp.author.id).toBe(studentId);
  });
});
