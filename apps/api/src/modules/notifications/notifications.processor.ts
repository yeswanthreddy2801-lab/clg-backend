import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { prismaClient as prisma } from 'src/prisma/client';

@Processor('notification-digest')
export class NotificationDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDigestProcessor.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'process-digests') {
      try {
        this.logger.log('Running notification digest generation...');

        // Find all users who have a digest list
        const keys = await this.redisClient.keys('digest:notification:*');
        
        for (const key of keys) {
          const targetUserId = key.split(':')[2];
          
          // Pop everything from the list
          const length = await this.redisClient.llen(key);
          if (length === 0) continue;

          const eventsRaw = await this.redisClient.lrange(key, 0, -1);
          await this.redisClient.del(key); // Clear the list

          if (eventsRaw.length === 0) continue;

          const events = eventsRaw.map(e => JSON.parse(e));
          
          // Group by type (mostly 'like' right now based on our routing)
          const likesCount = events.filter(e => e.type === 'like').length;

          if (likesCount > 0) {
            // Generate a single digest notification
            await prisma.notification.create({
              data: {
                userId: targetUserId,
                actorId: 'system', // Not a specific user, it's a digest
                type: 'digest',
                targetType: 'digest',
                targetId: 'daily-digest',
                // Ideally schema would have a `content` field for notifications to hold "You have 5 new likes",
                // but we map it via targetType='digest' which the frontend will parse.
              }
            });
            this.logger.log(`Created digest for user ${targetUserId} with ${likesCount} likes.`);
          }
        }

        this.logger.log('Notification digest generation complete.');
      } catch (e) {
        this.logger.error('Failed to run digest generation', e);
        throw e;
      }
    }
  }
}
