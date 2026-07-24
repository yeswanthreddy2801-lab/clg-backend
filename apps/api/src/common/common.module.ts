import { Module, Global } from '@nestjs/common';
import { NotificationEventPublisher } from './events/notification.publisher';

@Global()
@Module({
  providers: [NotificationEventPublisher],
  exports: [NotificationEventPublisher],
})
export class CommonModule {}
