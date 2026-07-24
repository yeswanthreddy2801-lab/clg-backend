import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/users.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  constructor(
    @InjectQueue('accountDeletion') private readonly accountDeletionQueue: Queue
  ) {}

  async getProfile(userId: string, targetId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetId, deactivated: false },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
            stories: true,
            projects: true,
          }
        },
        settings: {
          select: { privacyProfile: true }
        }
      }
    });

    if (!user) throw new NotFoundException('User not found');

    // Block check
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetId },
          { blockerId: targetId, blockedId: userId }
        ]
      }
    });

    if (block) {
      throw new ForbiddenException('You cannot view this profile');
    }

    // Privacy check
    if (user.settings?.privacyProfile === 'none' && userId !== targetId) {
      throw new ForbiddenException('This profile is private');
    }

    if (user.settings?.privacyProfile === 'followers' && userId !== targetId) {
      const isFollowing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } }
      });
      if (!isFollowing) {
        throw new ForbiddenException('You must follow this user to view their profile');
      }
    }

    delete (user as any).passwordHash;
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        bio: dto.bio,
        branch: dto.branch,
        year: dto.year,
        skills: dto.skills,
        socialLinks: dto.socialLinks ? dto.socialLinks : undefined,
        avatarUrl: dto.avatarUrl,
        coverUrl: dto.coverUrl,
      },
      select: { id: true, name: true, bio: true, branch: true, year: true, skills: true, socialLinks: true, avatarUrl: true, coverUrl: true }
    });
  }

  // Follow System
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException('Cannot follow yourself');

    const followingUser = await prisma.user.findUnique({ where: { id: followingId, deactivated: false } });
    if (!followingUser) throw new NotFoundException('User not found');

    // Block check
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: followingId },
          { blockerId: followingId, blockedId: followerId }
        ]
      }
    });

    if (block) throw new ForbiddenException('Cannot follow this user');

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {}
    });

    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } }
      });
    } catch(e) {}
    return { success: true };
  }

  async getFollowers(userId: string) {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    return followers.map(f => f.follower);
  }

  async getFollowing(userId: string) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    return following.map(f => f.following);
  }

  // Settings
  async getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto
    });
  }

  // Block System
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');

    await prisma.$transaction([
      // Create block
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {}
      }),
      // Sever follow relationships in both directions
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId }
          ]
        }
      })
    ]);
    return { success: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    try {
      await prisma.block.delete({
        where: { blockerId_blockedId: { blockerId, blockedId } }
      });
    } catch(e) {}
    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    return blocks.map(b => b.blocked);
  }

  // Account Deletion
  async deactivateAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { deactivated: true }
    });
    return { success: true, message: 'Account deactivated' };
  }

  async requestAccountDeletion(userId: string) {
    await this.deactivateAccount(userId);
    // Queue job with 30-day delay
    await this.accountDeletionQueue.add('hard-delete', { userId }, { delay: 30 * 24 * 60 * 60 * 1000 });
    return { success: true, message: 'Account deletion requested and queued.' };
  }

  // Tab Feeds
  async getUserPosts(userId: string, targetId: string) {
    await this.getProfile(userId, targetId); // Access check
    return prisma.post.findMany({ where: { authorId: targetId }, orderBy: { createdAt: 'desc' } });
  }

  async getUserStories(userId: string, targetId: string) {
    await this.getProfile(userId, targetId); 
    const now = new Date();
    const activeTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return prisma.story.findMany({ 
      where: { authorId: targetId, createdAt: { gt: activeTime } }, 
      orderBy: { createdAt: 'desc' } 
    });
  }

  async getUserReels(userId: string, targetId: string) {
    await this.getProfile(userId, targetId); 
    return prisma.reel.findMany({ where: { authorId: targetId }, orderBy: { createdAt: 'desc' } });
  }

  async getUserProjects(userId: string, targetId: string) {
    await this.getProfile(userId, targetId); 
    const where: Prisma.ProjectWhereInput = {
      teamMembers: { some: { userId: targetId } }
    };
    
    // Only show pending projects if user is viewing their own profile
    if (userId !== targetId) {
      where.status = 'approved';
    }

    return prisma.project.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
}
