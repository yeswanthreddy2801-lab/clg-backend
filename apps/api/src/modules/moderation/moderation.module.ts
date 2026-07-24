import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService], // So it can be injected into Feed/Talent/Marketplace directly if needed
})
export class ModerationModule {}
