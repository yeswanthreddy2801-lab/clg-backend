import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto, AddRecentSearchDto } from './dto/search.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @CurrentCollege() collegeId: string,
    @Query() query: SearchQueryDto
  ) {
    return this.searchService.search(collegeId, query);
  }

  @Get('recent')
  getRecentSearches(@CurrentUser() user: any) {
    return this.searchService.getRecentSearches(user.userId);
  }

  @Post('recent')
  addRecentSearch(
    @CurrentUser() user: any,
    @Body() dto: AddRecentSearchDto
  ) {
    return this.searchService.addRecentSearch(user.userId, dto.query);
  }
}
