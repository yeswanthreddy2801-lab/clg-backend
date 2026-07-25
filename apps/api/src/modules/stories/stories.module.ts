import { Module } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { ConfigModule } from '@nestjs/config';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ConfigModule, ModerationModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
