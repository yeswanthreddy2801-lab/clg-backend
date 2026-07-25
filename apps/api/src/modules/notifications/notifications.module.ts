import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConfigModule } from '@nestjs/config';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationConsumerService } from './notifications.consumer.service';
import { NotificationDigestProcessor } from './notifications.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'notification-digest' })
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService, 
    NotificationConsumerService,
    NotificationDigestProcessor
  ],
})
export class NotificationsModule {
  constructor(@InjectQueue('notification-digest') private readonly digestQueue: Queue) {}

  async onModuleInit() {
    // Run digest processing periodically (e.g., every 12 hours)
    await this.digestQueue.add('process-digests', {}, {
      repeat: { pattern: '0 */12 * * *' } 
    });
  }
}
