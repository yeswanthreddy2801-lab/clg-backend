import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Processor('spam-detection')
export class SpamDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(SpamDetectionProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'scan-accounts') {
      try {
        this.logger.log('Running nightly spam detection scan...');

        const users = await prisma.user.findMany({
          where: { role: 'student' }
        });

        // We need an automod user
        let automodUser = await prisma.user.findFirst({ where: { email: 'automod@campusverse.local' } });
        if (!automodUser) {
          automodUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
        }

        if (!automodUser) return;

        for (const user of users) {
          // Heuristic 1: Follow/follower ratio anomaly
          const followingCount = await prisma.follow.count({ where: { followerId: user.id } });
          const followerCount = await prisma.follow.count({ where: { followingId: user.id } });
          
          const isSpamRatio = followingCount > 100 && followerCount < 5;

          // Heuristic 2: Posting velocity (e.g., > 50 posts in last 24h)
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentPosts = await prisma.post.findMany({
            where: { authorId: user.id, createdAt: { gte: yesterday } },
            select: { content: true }
          });
          const postCount = recentPosts.length;

          // Heuristic 3: Duplicate content pattern
          let maxDuplicates = 0;
          const contentCounts = new Map<string, number>();
          for (const post of recentPosts) {
            if (!post.content) continue;
            // simplistic duplicate check (exact match after trim/lower)
            const normalized = post.content.trim().toLowerCase();
            const count = (contentCounts.get(normalized) || 0) + 1;
            contentCounts.set(normalized, count);
            if (count > maxDuplicates) maxDuplicates = count;
          }

          const hasDuplicatePattern = maxDuplicates >= 3;

          if (isSpamRatio || postCount > 50 || hasDuplicatePattern) {
            // Flag for Super Admin review
            const existingReport = await prisma.report.findFirst({
              where: { targetType: 'user', targetId: user.id, status: 'escalated' }
            });

            if (!existingReport) {
              let reason = 'Spam heuristics triggered.';
              if (isSpamRatio) reason += ` Following: ${followingCount}, Followers: ${followerCount}.`;
              if (postCount > 50) reason += ` Posts 24h: ${postCount}.`;
              if (hasDuplicatePattern) reason += ` Repeated identical post ${maxDuplicates} times.`;

              await prisma.report.create({
                data: {
                  reporterId: automodUser.id,
                  targetType: 'user',
                  targetId: user.id,
                  reason: reason.trim(),
                  collegeId: null, // Escalate to Super Admin globally
                  status: 'escalated'
                }
              });
              this.logger.warn(`Flagged user ${user.id} for potential spam.`);
            }
          }
        }

        this.logger.log('Spam detection scan complete.');
      } catch (e) {
        this.logger.error('Failed to run spam detection', e);
        throw e;
      }
    }
  }
}
