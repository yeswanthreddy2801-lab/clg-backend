import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

@Injectable()
export class CollegesService {
  private readonly logger = new Logger(CollegesService.name);
  private redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async getCollegeMetadata(collegeId: string) {
    const cacheKey = `college:meta:${collegeId}`;

    // 1. Check cache (Cache-Aside Pattern)
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);
    // 2. Fetch from primary database (or read replica)
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (college) {
      // 3. Populate cache with TTL (e.g. 1 hour)
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(college));
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
    await this.redisClient.del(cacheKey);
    this.logger.log(`Invalidated cache for ${cacheKey}`);

    return updated;
  }
}
