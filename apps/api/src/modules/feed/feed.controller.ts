import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { CreatePostDto, CreateCommentDto } from './dto/feed.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post('posts')
  createPost(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.feedService.createPost(user.userId, collegeId, dto);
  }

  @Get()
  getFeed(
    @CurrentCollege() collegeId: string,
    @Query('cursorId') cursorId?: string,
    @Query('cursorCreatedAt') cursorCreatedAt?: string,
    @Query('limit') limit?: number,
  ) {
    const dateCursor = cursorCreatedAt ? new Date(cursorCreatedAt) : undefined;
    return this.feedService.getFeed(collegeId, cursorId, dateCursor, limit ? Number(limit) : 20);
  }

  @Get('trending')
  getTrending(@CurrentCollege() collegeId: string) {
    return this.feedService.getTrending(collegeId);
  }


  @Post('posts/:id/save')
  bookmarkPost(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') postId: string,
  ) {
    return this.feedService.bookmarkPost(user.userId, collegeId, postId);
  }

  @Delete('posts/:id/save')
  unbookmarkPost(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') postId: string,
  ) {
    return this.feedService.unbookmarkPost(user.userId, collegeId, postId);
  }
}
