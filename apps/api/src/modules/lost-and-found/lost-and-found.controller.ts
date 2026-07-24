import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LostAndFoundService } from './lost-and-found.service';
import { CreateLostFoundReportDto, GetLostFoundReportsDto } from './dto/lost-and-found.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('lost-found/reports')
export class LostAndFoundController {
  constructor(private readonly lostAndFoundService: LostAndFoundService) {}

  @Post()
  createReport(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateLostFoundReportDto,
  ) {
    return this.lostAndFoundService.createReport(user.userId, collegeId, dto);
  }

  @Get()
  getReports(
    @CurrentCollege() collegeId: string,
    @Query() query: GetLostFoundReportsDto,
  ) {
    return this.lostAndFoundService.getReports(collegeId, query);
  }

  @Patch(':id/resolve')
  resolveReport(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') reportId: string,
  ) {
    return this.lostAndFoundService.resolveReport(user.userId, user.role, collegeId, reportId);
  }
}
