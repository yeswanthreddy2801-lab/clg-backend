import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/projects.dto';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.getProjects(collegeId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  getProject(
    @CurrentCollege() collegeId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.getProject(collegeId, projectId);
  }
}
