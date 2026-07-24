import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TalentService } from './talent.service';
import { UpsertTalentProfileDto } from './dto/talent.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  @Post('profiles')
  upsertProfile(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: UpsertTalentProfileDto,
  ) {
    return this.talentService.upsertProfile(user.userId, collegeId, dto);
  }

  @Get()
  searchTalent(
    @CurrentCollege() collegeId: string,
    @Query('skills') skills?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.talentService.searchTalent(collegeId, skills, keyword);
  }

  @Get(':userId')
  getProfile(
    @CurrentCollege() collegeId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.talentService.getProfile(collegeId, targetUserId);
  }
}
