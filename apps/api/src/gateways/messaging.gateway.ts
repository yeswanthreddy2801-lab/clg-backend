import { 
  WebSocketGateway, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket, 
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from '../modules/messaging/messaging.service';
import { ModerationService } from '../modules/moderation/moderation.service';
import Redis from 'ioredis';
import { SendMessageDto } from '../modules/messaging/dto/messaging.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@WebSocketGateway({
  cors: { origin: '*' }
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private redis: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagingService: MessagingService,
    private readonly moderationService: ModerationService
  ) {
    this.redis = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No token');
      
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      });
      
      client.data.user = payload; // payload.sub is userId

      // Store presence in Redis (TTL 60s, client must send heartbeat to maintain)
      await this.redis.set(`presence:${payload.sub}`, 'online', 'EX', 60);

      // Join a personal room for direct notification pushing
      client.join(`user_${payload.sub}`);

      // Broadcast online status to participants of their active conversations
      const conversations = await prisma.conversationParticipant.findMany({
        where: { userId: payload.sub }
      });
      
      conversations.forEach(c => {
        client.join(`conversation_${c.conversationId}`);
        client.to(`conversation_${c.conversationId}`).emit('presence:online', { userId: payload.sub });
      });

    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data?.user?.sub) {
      const userId = client.data.user.sub;
      await this.redis.del(`presence:${userId}`);

      const conversations = await prisma.conversationParticipant.findMany({
        where: { userId }
      });

      conversations.forEach(c => {
        client.to(`conversation_${c.conversationId}`).emit('presence:offline', { userId });
      });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    if (client.data?.user?.sub) {
      await this.redis.set(`presence:${client.data.user.sub}`, 'online', 'EX', 60);
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto
  ) {
    try {
      const userId = client.data.user.sub;

      // Privacy-respecting moderation scan
      if (payload.type === 'text' && payload.content) {
        // Fire and forget to not block real-time delivery
        this.moderationService.scanContent({
          targetType: 'message',
          targetId: 'pending-message',
          text: payload.content,
          collegeId: client.data.user.collegeId
        }).catch(e => console.error('Moderation scan failed', e));
      }

      const message = await this.messagingService.saveMessage(userId, payload);
      
      // Broadcast to everyone in the conversation room
      this.server.to(`conversation_${payload.conversationId}`).emit('message:new', message);
    } catch (e) {
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('message:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string }
  ) {
    const userId = client.data.user.sub;
    client.to(`conversation_${payload.conversationId}`).emit('message:typing', {
      conversationId: payload.conversationId,
      userId
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string, conversationId: string }
  ) {
    const userId = client.data.user.sub;
    
    // Upsert receipt
    await prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId: payload.messageId, userId } },
      create: { messageId: payload.messageId, userId, status: 'read' },
      update: { status: 'read' }
    });

    // Notify sender that message was read
    this.server.to(`conversation_${payload.conversationId}`).emit('message:read', {
      messageId: payload.messageId,
      userId
    });
  }
}
