import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto, CreateRecruitmentPostDto, ApplyRecruitmentDto } from './dto/clubs.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  createClub(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateClubDto,
  ) {
    return this.clubsService.createClub(user.userId, collegeId, dto);
  }

  @Get()
  getClubs(@CurrentCollege() collegeId: string) {
    return this.clubsService.getClubs(collegeId);
  }

  @Get(':id')
  getClub(
    @CurrentCollege() collegeId: string,
    @Param('id') clubId: string,
  ) {
    return this.clubsService.getClub(collegeId, clubId);
  }

  @Post(':id/join')
  joinClub(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
  ) {
    return this.clubsService.joinClub(user.userId, clubId);
  }

  @Delete(':id/join')
  leaveClub(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
  ) {
    return this.clubsService.leaveClub(user.userId, clubId);
  }

  @Post(':id/recruitment')
  createRecruitmentPost(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
    @Body() dto: CreateRecruitmentPostDto,
  ) {
    return this.clubsService.createRecruitmentPost(user.userId, clubId, dto);
  }

  @Post(':id/recruitment/:postId/apply')
  applyForRecruitment(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body() dto: ApplyRecruitmentDto,
  ) {
    return this.clubsService.applyForRecruitment(user.userId, postId, dto);
  }
}
