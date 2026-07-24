import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateStoryDto, CreateChapterDto } from './dto/stories.dto';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

@Injectable()
export class StoriesService {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async createStory(userId: string, collegeId: string, dto: CreateStoryDto) {
    return prisma.story.create({
      data: {
        authorId: userId,
        collegeId,
        title: dto.title,
        category: dto.category,
        tags: dto.tags || [],
        coverMediaId: dto.coverMediaId,
        status: 'draft',
      },
    });
  }

  async addChapter(userId: string, collegeId: string, storyId: string, dto: CreateChapterDto) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.collegeId !== collegeId || story.authorId !== userId) {
      throw new ForbiddenException('Cannot modify this story');
    }

    return prisma.storyChapter.create({
      data: {
        storyId,
        title: dto.title,
        content: dto.content,
        order: dto.order,
      },
    });
  }

  async publishStory(userId: string, collegeId: string, storyId: string) {
    const story = await prisma.story.findUnique({ 
      where: { id: storyId },
      include: { _count: { select: { chapters: true } } },
    });
    
    if (!story || story.collegeId !== collegeId || story.authorId !== userId) {
      throw new ForbiddenException('Cannot modify this story');
    }

    if (story._count.chapters === 0) {
      throw new BadRequestException('Cannot publish a story with zero chapters');
    }

    return prisma.story.update({
      where: { id: storyId },
      data: { status: 'published' },
    });
  }

  async getPublishedStories(collegeId: string, page = 1, limit = 10, category?: string) {
    const skip = (page - 1) * limit;
    
    return prisma.story.findMany({
      where: {
        collegeId,
        status: 'published',
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      }
    });
  }

  async getStoryMetadata(collegeId: string, storyId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        chapters: { select: { id: true, title: true, order: true } },
      }
    });

    if (!story || story.collegeId !== collegeId || story.deletedAt) {
      throw new NotFoundException('Story not found');
    }

    return story;
  }

  async readChapter(userId: string, collegeId: string, storyId: string, chapterId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { where: { id: chapterId } },
      },
    });

    if (!story || story.collegeId !== collegeId || story.chapters.length === 0) {
      throw new NotFoundException('Chapter not found');
    }

    // View deduplication logic
    const viewKey = `view:story:${storyId}:${userId}`;
    const isNewView = await this.redisClient.set(viewKey, '1', 'EX', 3600, 'NX');

    if (isNewView) {
      await prisma.$transaction([
        prisma.storyView.upsert({
          where: { userId_storyId: { userId, storyId } },
          update: {},
          create: { userId, storyId },
        }),
        prisma.story.update({
          where: { id: storyId },
          data: { viewCount: { increment: 1 } },
        })
      ]);
    }

    return story.chapters[0];
  }

  async bookmarkStory(userId: string, collegeId: string, storyId: string, chapterId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.collegeId !== collegeId) {
      throw new ForbiddenException('Cannot interact with this story');
    }

    return prisma.storyBookmark.upsert({
      where: { userId_storyId: { userId, storyId } },
      update: { lastReadChapter: chapterId },
      create: { userId, storyId, lastReadChapter: chapterId },
    });
  }
}
