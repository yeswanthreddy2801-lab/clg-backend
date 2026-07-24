import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto, CreateChapterDto } from './dto/stories.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  createStory(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateStoryDto,
  ) {
    return this.storiesService.createStory(user.userId, collegeId, dto);
  }

  @Post(':id/chapters')
  addChapter(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') storyId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.storiesService.addChapter(user.userId, collegeId, storyId, dto);
  }

  @Patch(':id/publish')
  publishStory(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') storyId: string,
  ) {
    return this.storiesService.publishStory(user.userId, collegeId, storyId);
  }

  @Get()
  getStories(
    @CurrentCollege() collegeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.storiesService.getPublishedStories(
      collegeId, 
      page ? parseInt(page) : 1, 
      limit ? parseInt(limit) : 10, 
      category
    );
  }

  @Get(':id')
  getStoryMetadata(
    @CurrentCollege() collegeId: string,
    @Param('id') storyId: string,
  ) {
    return this.storiesService.getStoryMetadata(collegeId, storyId);
  }

  @Get(':id/chapters/:chapterId')
  readChapter(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') storyId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.storiesService.readChapter(user.userId, collegeId, storyId, chapterId);
  }

  @Post(':id/bookmark')
  bookmarkStory(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') storyId: string,
    @Body('chapterId') chapterId: string,
  ) {
    return this.storiesService.bookmarkStory(user.userId, collegeId, storyId, chapterId);
  }
}
