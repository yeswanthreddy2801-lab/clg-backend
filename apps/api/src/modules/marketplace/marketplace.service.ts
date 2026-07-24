import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateMarketplaceListingDto, UpdateMarketplaceStatusDto, GetMarketplaceListingsDto } from './dto/marketplace.dto';

const prisma = new PrismaClient();

@Injectable()
export class MarketplaceService {
  async createListing(userId: string, collegeId: string, dto: CreateMarketplaceListingDto) {
    return prisma.marketplaceListing.create({
      data: {
        sellerId: userId,
        collegeId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        condition: dto.condition,
        mediaIds: dto.mediaIds || [],
      },
    });
  }

  async getListings(collegeId: string, query: GetMarketplaceListingsDto) {
    const where: Prisma.MarketplaceListingWhereInput = { collegeId };

    if (query.category) {
      where.category = query.category;
    }
    if (query.condition) {
      where.condition = query.condition;
    }
    
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.price.lte = parseFloat(query.maxPrice);
    }

    return prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }

  async updateStatus(userId: string, collegeId: string, listingId: string, dto: UpdateMarketplaceStatusDto) {
    const listing = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
    
    if (!listing || listing.collegeId !== collegeId) {
      throw new NotFoundException('Listing not found');
    }
    
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can update the status');
    }

    return prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: dto.status },
    });
  }
}
