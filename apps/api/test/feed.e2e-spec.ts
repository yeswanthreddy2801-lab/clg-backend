import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('FeedController (e2e)', () => {
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

  it('/feed/posts (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/feed/posts')
      .send({ type: 'text', content: 'Hello #world @user' })
      .expect(401);
  });

  // Additional tests for hashtag/mention extraction, pagination cursor correctness, 
  // and TenantGuard rejections (403 cross-college) would go here.
});
