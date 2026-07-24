import { Module, OnModuleInit } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AdminAnalyticsProcessor } from './admin.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'admin-analytics',
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsProcessor],
})
export class AdminModule implements OnModuleInit {
  constructor(@InjectQueue('admin-analytics') private readonly analyticsQueue: Queue) {}

  async onModuleInit() {
    // Register repeatable job for midnight daily
    await this.analyticsQueue.add('aggregate-daily-stats', {}, {
      repeat: {
        pattern: '0 0 * * *' // Every day at midnight
      }
    });
  }
}
