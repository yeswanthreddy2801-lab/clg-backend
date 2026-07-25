import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { SuggestTagsDto } from './dto/recommendations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('feed')
  getFeedRecommendations(@CurrentUser() user: any) {
    return this.recommendationsService.getFeedRecommendations(user.userId, user.collegeId);
  }

  @Get('stories')
  getStoriesRecommendations(@CurrentUser() user: any) {
    return this.recommendationsService.getStoriesRecommendations(user.userId, user.collegeId);
  }

  @Get('projects')
  getProjectsRecommendations(@CurrentUser() user: any) {
    return this.recommendationsService.getProjectsRecommendations(user.userId, user.collegeId);
  }

  @Post('suggest-tags')
  suggestTags(@Body() dto: SuggestTagsDto) {
    return this.recommendationsService.suggestTags(dto.text);
  }
}
