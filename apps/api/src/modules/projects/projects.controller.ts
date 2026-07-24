import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, GetProjectsQueryDto } from './dto/projects.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(user.userId, collegeId, dto);
  }

  @Get()
  getProjects(
    @CurrentCollege() collegeId: string,
    @Query() query: GetProjectsQueryDto,
  ) {
    return this.projectsService.getProjects(collegeId, query);
  }

  @Get(':id')
  getProject(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.getProject(user.userId, collegeId, projectId);
  }

  @Post(':id/bookmark')
  bookmarkProject(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.bookmarkProject(user.userId, projectId);
  }

  @Delete(':id/bookmark')
  unbookmarkProject(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.unbookmarkProject(user.userId, projectId);
  }
}
