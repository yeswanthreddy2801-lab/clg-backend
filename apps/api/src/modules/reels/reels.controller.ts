import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReelsService } from './reels.service';
import { CreateReelDto } from './dto/reels.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
  createReel(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateReelDto,
  ) {
    return this.reelsService.createReel(user.userId, collegeId, dto);
  }

  @Get()
  getReels(
    @CurrentCollege() collegeId: string,
    @Query('cursorId') cursorId?: string,
    @Query('cursorCreatedAt') cursorCreatedAt?: string,
    @Query('limit') limit?: string,
  ) {
    const dateCursor = cursorCreatedAt ? new Date(cursorCreatedAt) : undefined;
    return this.reelsService.getReels(collegeId, cursorId, dateCursor, limit ? parseInt(limit) : 20);
  }

  @Post(':id/view')
  readReel(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.readReel(user.userId, collegeId, reelId);
  }
}
