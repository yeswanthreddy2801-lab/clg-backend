import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateReelDto } from './dto/reels.dto';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class ReelsService {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async createReel(userId: string, collegeId: string, dto: CreateReelDto) {
    return prisma.reel.create({
      data: {
        authorId: userId,
        collegeId,
        mediaId: dto.mediaId,
        caption: dto.caption,
        category: dto.category,
      },
    });
  }

  async getReels(collegeId: string, cursorId?: string, cursorCreatedAt?: Date, limit = 20) {
    const cursorObj = cursorId && cursorCreatedAt ? {
      collegeId_createdAt: {
        collegeId,
        createdAt: cursorCreatedAt,
      }
    } : undefined;

    return prisma.reel.findMany({
      where: { collegeId, deletedAt: null },
      take: limit,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj ? { id: cursorId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async readReel(userId: string, collegeId: string, reelId: string) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel || reel.collegeId !== collegeId || reel.deletedAt) {
      throw new NotFoundException('Reel not found');
    }

    // View deduplication logic
    const viewKey = `view:reel:${reelId}:${userId}`;
    const isNewView = await this.redisClient.set(viewKey, '1', 'EX', 3600, 'NX');

    if (isNewView) {
      await prisma.$transaction([
        prisma.reelView.upsert({
          where: { userId_reelId: { userId, reelId } },
          update: {},
          create: { userId, reelId },
        }),
        prisma.reel.update({
          where: { id: reelId },
          data: { viewCount: { increment: 1 } },
        })
      ]);
    }

    return { success: true };
  }
}
