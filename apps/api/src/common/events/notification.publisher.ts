import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationEventPublisher {
  private readonly logger = new Logger(NotificationEventPublisher.name);

  constructor(private eventEmitter: EventEmitter2) {}

  publish(eventPattern: string, payload: any) {
    this.logger.log(`Publishing event ${eventPattern}: ${JSON.stringify(payload)}`);
    // Placeholder for Kafka. For now, use in-process event emitter.
    this.eventEmitter.emit(eventPattern, payload);
  }
}
