import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';
import { RedisIoAdapter } from '../src/common/adapters/redis-io.adapter';
import { ConfigService } from '@nestjs/config';

describe('Phase 12 (Messaging & WebSockets) (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let jwtService: JwtService;

  let collegeId: string;
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let conversationId: string;

  let socketA: Socket;
  let socketB: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Mount Redis adapter for websockets in tests as well
    const configService = app.get(ConfigService);
    const redisIoAdapter = new RedisIoAdapter(app, configService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.listen(3001); // Need an actual port for websockets

    // Setup Test Data
    const college = await prisma.college.create({
      data: { name: 'Phase 12 College', domain: 'phase12.edu', status: 'active' },
    });
    collegeId = college.id;

    const userA = await prisma.user.create({
      data: { collegeId, email: 'usera_p12@phase12.edu', passwordHash: 'dummy', name: 'User A' }
    });
    userAId = userA.id;
    userAToken = jwtService.sign({ sub: userA.id, email: userA.email, collegeId, role: 'student' });

    const userB = await prisma.user.create({
      data: { collegeId, email: 'userb_p12@phase12.edu', passwordHash: 'dummy', name: 'User B' }
    });
    userBId = userB.id;
    userBToken = jwtService.sign({ sub: userB.id, email: userB.email, collegeId, role: 'student' });

    // Create Conversation manually for testing
    const convo = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: userAId }, { userId: userBId }]
        }
      }
    });
    conversationId = convo.id;

    // Setup Sockets
    socketA = io('http://localhost:3001', {
      auth: { token: userAToken }
    });
    
    socketB = io('http://localhost:3001', {
      auth: { token: userBToken }
    });

    await new Promise<void>((resolve) => {
      let connections = 0;
      const check = () => { if (++connections === 2) resolve(); };
      socketA.on('connect', check);
      socketB.on('connect', check);
    });
  });

  afterAll(async () => {
    socketA.disconnect();
    socketB.disconnect();
    await prisma.college.delete({ where: { id: collegeId } });
    await app.close();
  });

  it('should deliver a message from User A to User B in real-time', (done) => {
    socketB.on('message:new', (message) => {
      expect(message.content).toBe('Hello from User A');
      expect(message.senderId).toBe(userAId);
      done();
    });

    socketA.emit('message:send', {
      conversationId,
      type: 'text',
      content: 'Hello from User A'
    });
  });

  it('should reject a message if User B blocks User A', async () => {
    // User B blocks User A
    await prisma.block.create({
      data: { blockerId: userBId, blockedId: userAId }
    });

    return new Promise<void>((resolve) => {
      socketA.on('error', (err) => {
        expect(err.message).toBe('Cannot send message, block exists');
        resolve();
      });

      socketA.emit('message:send', {
        conversationId,
        type: 'text',
        content: 'This should fail'
      });
    });
  });
});
