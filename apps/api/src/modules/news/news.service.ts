import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateNewsDto } from './dto/news.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class NewsService {
  async createNews(userId: string, collegeId: string, dto: CreateNewsDto) {
    return prisma.newsPost.create({
      data: {
        publishedByAdminId: userId,
        collegeId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        isPinned: dto.isPinned || false,
        isOfficial: true,
        mediaId: dto.mediaId,
      },
    });
  }

  async getNews(collegeId: string, category?: string) {
    const whereClause: any = { collegeId };
    if (category) {
      whereClause.category = category;
    }

    return prisma.newsPost.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        publisher: { select: { id: true, name: true, avatarUrl: true } },
      }
    });
  }
}
