import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { ContentModerationProvider, OpenAIModerationProvider } from '../../common/providers/content-moderation.provider';
import { RecommendationProvider, StubbedRecommendationProvider } from '../../common/providers/recommendation.provider';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SpamDetectionProcessor } from './spam.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'spam-detection',
    }),
  ],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    SpamDetectionProcessor,
    { provide: ContentModerationProvider, useClass: OpenAIModerationProvider },
    { provide: RecommendationProvider, useClass: StubbedRecommendationProvider }
  ],
  exports: [ModerationService], // So it can be injected into Feed/Talent/Marketplace directly if needed
})
export class ModerationModule {
  constructor(@InjectQueue('spam-detection') private readonly spamQueue: Queue) {}

  async onModuleInit() {
    // Nightly spam detection job
    await this.spamQueue.add('scan-accounts', {}, {
      repeat: { pattern: '0 1 * * *' } // 1 AM daily
    });
  }
}
