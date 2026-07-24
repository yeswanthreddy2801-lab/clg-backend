import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/news.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @Roles('college_admin', 'super_admin')
  createNews(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateNewsDto,
  ) {
    return this.newsService.createNews(user.userId, collegeId, dto);
  }

  @Get()
  getNews(
    @CurrentCollege() collegeId: string,
    @Query('category') category?: string,
  ) {
    return this.newsService.getNews(collegeId, category);
  }
}
