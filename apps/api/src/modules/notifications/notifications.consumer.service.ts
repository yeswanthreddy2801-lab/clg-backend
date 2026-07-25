import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

@Injectable()
export class NotificationConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async onModuleInit() {
    const brokers = this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'notification-consumer',
      brokers: brokers.split(','),
    });

    this.consumer = this.kafka.consumer({ groupId: 'notification-consumer-group' });
    
    try {
      await this.consumer.connect();
      // Listen to a generic interaction event topic, or specific ones. 
      // Emitted by Phase 3-9 services (e.g. `interaction.like`, `interaction.follow`)
      await this.consumer.subscribe({ topic: 'interaction.event', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;
          try {
            const event = JSON.parse(message.value.toString());
            await this.handleNotificationEvent(event);
          } catch (err) {
            this.logger.error(`Error processing Notification Kafka message on ${topic}:`, err);
          }
        },
      });
      this.logger.log('Notification Kafka consumer started.');
    } catch (e) {
      this.logger.error('Failed to connect to Kafka (notification consumer)', e);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
    } catch (e) {}
  }

  private async handleNotificationEvent(event: any) {
    const { actorId, targetUserId, type, targetType, targetId } = event;
    // type: like, comment, mention, follow, event, news

    if (actorId === targetUserId) return; // Don't notify self

    // Fetch user settings to check if this category is enabled
    const settings = await prisma.userSettings.findUnique({ where: { userId: targetUserId } });

    // Global toggle
    if (settings && settings.notificationsEnabled === false) return;

    // Categorical toggles
    if (settings) {
      if (type === 'like' && !settings.notifyLikes) return;
      if (type === 'comment' && !settings.notifyComments) return;
      if (type === 'mention' && !settings.notifyMentions) return;
      if (type === 'follow' && !settings.notifyFollows) return;
      if (type === 'event' && !settings.notifyEvents) return;
      if (type === 'news' && !settings.notifyNews) return;
    }

    // Digest Batching Logic (Phase 14)
    // For low priority notifications (e.g., likes from someone you don't follow back), batch them.
    if (type === 'like') {
      // Check if targetUserId follows actorId
      const isMutual = await prisma.follow.findFirst({
        where: { followerId: targetUserId, followingId: actorId }
      });
      
      if (!isMutual) {
        // Non-mutual like: low priority, send to digest
        const digestKey = `digest:notification:${targetUserId}`;
        await this.redisClient.rpush(digestKey, JSON.stringify(event));
        this.logger.debug(`Notification queued for digest for user ${targetUserId}, type ${type} (non-mutual)`);
        return;
      }
    }

    // Create immediate Notification
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        actorId,
        type,
        targetType,
        targetId,
      }
    });

    // TODO: Push real-time event over Socket.IO gateway (Phase 12 Integration)
    // this.notificationGateway.sendToUser(targetUserId, 'new_notification', notification);
    this.logger.debug(`Notification created for user ${targetUserId}, type ${type}`);
  }
}
