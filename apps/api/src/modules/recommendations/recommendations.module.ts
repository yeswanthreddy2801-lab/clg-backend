import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationProvider, OpenAIRecommendationProvider } from '../../common/providers/recommendation.provider';

@Module({
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    { provide: RecommendationProvider, useClass: OpenAIRecommendationProvider }
  ],
  exports: [RecommendationsService]
})
export class RecommendationsModule {}
