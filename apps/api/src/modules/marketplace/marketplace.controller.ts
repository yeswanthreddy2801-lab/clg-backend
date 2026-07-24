import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateMarketplaceListingDto, UpdateMarketplaceStatusDto, GetMarketplaceListingsDto } from './dto/marketplace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('marketplace/listings')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post()
  createListing(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateMarketplaceListingDto,
  ) {
    return this.marketplaceService.createListing(user.userId, collegeId, dto);
  }

  @Get()
  getListings(
    @CurrentCollege() collegeId: string,
    @Query() query: GetMarketplaceListingsDto,
  ) {
    return this.marketplaceService.getListings(collegeId, query);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') listingId: string,
    @Body() dto: UpdateMarketplaceStatusDto,
  ) {
    return this.marketplaceService.updateStatus(user.userId, collegeId, listingId, dto);
  }
}
