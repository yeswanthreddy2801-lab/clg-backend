import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Processor('admin-analytics')
export class AdminAnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AdminAnalyticsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'aggregate-daily-stats') {
      try {
        this.logger.log('Running daily platform analytics aggregation...');

        const totalUsers = await prisma.user.count();
        const totalPosts = await prisma.post.count();
        const totalColleges = await prisma.college.count();

        // Active today approximation
        const activeUsersToday = await prisma.user.count({
          where: {
            updatedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
          }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.platformAnalytics.upsert({
          where: { date: today },
          create: {
            date: today,
            totalUsers,
            totalPosts,
            totalColleges,
            activeUsersToday,
            metadataJson: { generatedAt: new Date().toISOString() }
          },
          update: {
            totalUsers,
            totalPosts,
            totalColleges,
            activeUsersToday,
            metadataJson: { generatedAt: new Date().toISOString() }
          }
        });

        this.logger.log('Successfully completed daily platform analytics aggregation.');
      } catch (e) {
        this.logger.error('Failed to run daily platform analytics aggregation', e);
        throw e;
      }
    }
  }
}
