import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateStatusDto, ResolveReportDto, CreateCollegeDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---------------------------------------------------------
  // College Admin Routes
  // ---------------------------------------------------------
  @Get('college/stats')
  @Roles('college_admin', 'super_admin')
  getCollegeStats(@CurrentCollege() collegeId: string) {
    return this.adminService.getCollegeStats(collegeId);
  }

  @Get('college/projects/pending')
  @Roles('college_admin', 'super_admin')
  getPendingProjects(@CurrentCollege() collegeId: string) {
    return this.adminService.getPendingProjects(collegeId);
  }

  @Patch('college/projects/:id/status')
  @Roles('college_admin', 'super_admin')
  updateProjectStatus(
    @CurrentCollege() collegeId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateStatusDto
  ) {
    return this.adminService.updateProjectStatus(collegeId, projectId, dto);
  }

  @Get('college/clubs/pending')
  @Roles('college_admin', 'super_admin')
  getPendingClubs(@CurrentCollege() collegeId: string) {
    return this.adminService.getPendingClubs(collegeId);
  }

  @Patch('college/clubs/:id/status')
  @Roles('college_admin', 'super_admin')
  updateClubStatus(
    @CurrentCollege() collegeId: string,
    @Param('id') clubId: string,
    @Body() dto: UpdateStatusDto
  ) {
    return this.adminService.updateClubStatus(collegeId, clubId, dto);
  }

  @Get('college/reports')
  @Roles('college_admin', 'super_admin')
  getCollegeReports(@CurrentCollege() collegeId: string) {
    return this.adminService.getCollegeReports(collegeId);
  }

  @Patch('college/reports/:id')
  @Roles('college_admin', 'super_admin')
  resolveReport(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') reportId: string,
    @Body() dto: ResolveReportDto
  ) {
    return this.adminService.resolveReport(collegeId, reportId, user.userId, dto);
  }

  // ---------------------------------------------------------
  // Super Admin Routes
  // ---------------------------------------------------------
  @Get('super/colleges')
  @Roles('super_admin')
  getAllColleges(@CurrentUser() user: any) {
    return this.adminService.getAllColleges(user.userId);
  }

  @Post('super/colleges')
  @Roles('super_admin')
  createCollege(@CurrentUser() user: any, @Body() dto: CreateCollegeDto) {
    return this.adminService.createCollege(user.userId, dto);
  }

  @Patch('super/colleges/:id/status')
  @Roles('super_admin')
  updateCollegeStatus(
    @CurrentUser() user: any,
    @Param('id') colId: string,
    @Body() dto: UpdateStatusDto
  ) {
    return this.adminService.updateCollegeStatus(user.userId, colId, dto);
  }

  @Get('super/users')
  @Roles('super_admin')
  getCrossTenantUsers(
    @CurrentUser() user: any,
    @Query('q') query: string
  ) {
    return this.adminService.getCrossTenantUsers(user.userId, query || '');
  }

  @Get('super/content-reports')
  @Roles('super_admin')
  getGlobalReports(@CurrentUser() user: any) {
    return this.adminService.getGlobalContentReports(user.userId);
  }

  @Get('super/analytics')
  @Roles('super_admin')
  getPlatformAnalytics(@CurrentUser() user: any) {
    return this.adminService.getPlatformAnalytics(user.userId);
  }
}
