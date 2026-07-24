import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/signup (POST) - fails with invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'invalid', password: 'password123', name: 'Test', collegeId: '123e4567-e89b-12d3-a456-426614174000' })
      .expect(400);
  });

  // Additional tests for /auth/login, /auth/verify-otp, rate-limiting, etc. would go here.
});
