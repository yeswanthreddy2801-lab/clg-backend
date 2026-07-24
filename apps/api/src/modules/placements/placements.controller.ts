import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PlacementsService } from './placements.service';
import { CreatePlacementExperienceDto, GetPlacementExperiencesDto, CreateReferralRequestDto } from './dto/placements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('placements')
export class PlacementsController {
  constructor(private readonly placementsService: PlacementsService) {}

  @Post('experiences')
  createExperience(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreatePlacementExperienceDto,
  ) {
    return this.placementsService.createExperience(user.userId, collegeId, dto);
  }

  @Get('experiences')
  getExperiences(
    @CurrentCollege() collegeId: string,
    @Query() query: GetPlacementExperiencesDto,
  ) {
    return this.placementsService.getExperiences(collegeId, query);
  }

  @Post('experiences/:id/upvote')
  upvoteExperience(
    @CurrentUser() user: any,
    @Param('id') experienceId: string,
  ) {
    return this.placementsService.upvoteExperience(user.userId, experienceId);
  }

  @Delete('experiences/:id/upvote')
  removeUpvote(
    @CurrentUser() user: any,
    @Param('id') experienceId: string,
  ) {
    return this.placementsService.removeUpvote(user.userId, experienceId);
  }

  @Post('referral-requests')
  createReferralRequest(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateReferralRequestDto,
  ) {
    return this.placementsService.createReferralRequest(user.userId, collegeId, dto);
  }

  @Get('referral-requests')
  getReferralRequests(@CurrentCollege() collegeId: string) {
    return this.placementsService.getReferralRequests(collegeId);
  }
}
