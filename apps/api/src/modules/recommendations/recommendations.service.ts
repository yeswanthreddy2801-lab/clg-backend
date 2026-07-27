import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RecommendationProvider } from '../../common/providers/recommendation.provider';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly recommendationProvider: RecommendationProvider) {}

  async getFeedRecommendations(userId: string, collegeId: string) {
    // 1. Fetch candidates (recent posts from own college)
    const candidates = await prisma.post.findMany({
      where: { collegeId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Top 100 candidates
    });

    // 2. Score them via the ML provider
    const scoredFeed = await this.recommendationProvider.scoreFeed(candidates, userId);

    // 3. Return top 20
    return scoredFeed.slice(0, 20);
  }

  async getStoriesRecommendations(userId: string, collegeId: string) {
    // Fetch stories from college
    const candidates = await prisma.story.findMany({
      where: { collegeId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const scoredStories = await this.recommendationProvider.scoreContentBased(candidates, userId);
    return scoredStories.slice(0, 10);
  }

  async getProjectsRecommendations(userId: string, collegeId: string) {
    // Fetch projects from college
    const candidates = await prisma.project.findMany({
      where: { collegeId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const scoredProjects = await this.recommendationProvider.scoreContentBased(candidates, userId);
    return scoredProjects.slice(0, 10);
  }

  async suggestTags(text: string) {
    if (!text || text.trim().length === 0) return [];
    return this.recommendationProvider.suggestTags(text);
  }
}
