import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NotificationEventPublisher } from '../../common/events/notification.publisher';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  constructor(private readonly publisher: NotificationEventPublisher) {}

  async followUser(followerId: string, followerCollegeId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    const followingUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!followingUser || followingUser.collegeId !== followerCollegeId) {
      throw new ForbiddenException('Cannot follow a user from a different college');
    }

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });

    this.publisher.publish('user.followed', { actorId: followerId, targetId: followingId });

    return { success: true };
  }

  async unfollowUser(followerId: string, followerCollegeId: string, followingId: string) {
    const followingUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!followingUser || followingUser.collegeId !== followerCollegeId) {
      throw new ForbiddenException('Cannot interact with this user');
    }

    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
    } catch (e) {
      // Ignore if not following
    }

    return { success: true };
  }
}
