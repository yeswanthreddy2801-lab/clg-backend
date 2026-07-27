import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class CollegesService {
  private readonly logger = new Logger(CollegesService.name);
  private redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  async getCollegeMetadata(collegeId: string) {
    const cacheKey = `college:meta:${collegeId}`;

    // 1. Check cache (Cache-Aside Pattern)
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for ${cacheKey}: ${e.message}`);
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);
    // 2. Fetch from primary database (or read replica)
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (college) {
      // 3. Populate cache with TTL (e.g. 1 hour)
      try {
        await this.redisClient.setex(cacheKey, 3600, JSON.stringify(college));
      } catch (e) {
        this.logger.warn(`Redis setex failed for ${cacheKey}: ${e.message}`);
      }
    }

    return college;
  }

  async updateCollegeMetadata(collegeId: string, data: any) {
    // 1. Write to primary database
    const updated = await prisma.college.update({
      where: { id: collegeId },
      data,
    });

    // 2. Explicit cache-invalidation hook
    const cacheKey = `college:meta:${collegeId}`;
    try {
      await this.redisClient.del(cacheKey);
      this.logger.log(`Invalidated cache for ${cacheKey}`);
    } catch (e) {
      this.logger.warn(`Redis del failed for ${cacheKey}: ${e.message}`);
    }

    return updated;
  }
  async getAllColleges() {
    const cacheKey = `colleges:all`;
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for ${cacheKey}: ${e.message}`);
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);
    const colleges = await prisma.college.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        domain: true,
        city: true,
        studentCount: true,
        logoUrl: true,
      }
    });

    try {
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(colleges));
    } catch (e) {
      this.logger.warn(`Redis setex failed for ${cacheKey}: ${e.message}`);
    }
    return colleges;
  }
}
