import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationConsumerService } from './notifications.consumer.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationConsumerService],
})
export class NotificationsModule {}
