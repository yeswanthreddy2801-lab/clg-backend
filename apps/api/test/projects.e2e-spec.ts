import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeId: string;
  let authorId: string;
  let authorToken: string;
  let otherStudentId: string;
  let otherStudentToken: string;
  let pendingProjectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // 1. Create a college
    const college = await prisma.college.create({
      data: { name: 'Projects Test College', domain: 'projectstest.edu', status: 'active' },
    });
    collegeId = college.id;

    // 2. Create Author
    const author = await prisma.user.create({
      data: {
        collegeId,
        email: 'author@projectstest.edu',
        passwordHash: 'dummy',
        name: 'Author Student',
      }
    });
    authorId = author.id;
    authorToken = jwtService.sign({ sub: author.id, email: author.email, collegeId });

    // 3. Create Other Student
    const other = await prisma.user.create({
      data: {
        collegeId,
        email: 'other@projectstest.edu',
        passwordHash: 'dummy',
        name: 'Other Student',
      }
    });
    otherStudentId = other.id;
    otherStudentToken = jwtService.sign({ sub: other.id, email: other.email, collegeId });

    // 4. Create a Pending Project for Author
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Pending Test Project',
        description: 'Testing visibility',
      });
    
    pendingProjectId = res.body.id;
  });

  afterAll(async () => {
    await prisma.college.delete({ where: { id: collegeId } });
    await app.close();
  });

  it('should not show a pending project to other students in the public feed', async () => {
    const res = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${otherStudentToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Should be empty because it's pending
  });

  it('should prevent other students from fetching the pending project directly by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/projects/${pendingProjectId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    
    expect(res.status).toBe(403);
  });

  it('should allow the author to fetch their own pending project directly by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/projects/${pendingProjectId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pendingProjectId);
  });

  it('should increment view count and debounce subsequent views by the same user', async () => {
    // 1st view
    await request(app.getHttpServer())
      .get(`/projects/${pendingProjectId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    
    const project1 = await prisma.project.findUnique({ where: { id: pendingProjectId } });
    const views1 = project1!.viewCount;

    // 2nd view right away
    await request(app.getHttpServer())
      .get(`/projects/${pendingProjectId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    
    const project2 = await prisma.project.findUnique({ where: { id: pendingProjectId } });
    expect(project2!.viewCount).toBe(views1); // Should not have incremented again
  });
});
