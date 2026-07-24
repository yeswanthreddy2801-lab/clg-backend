import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NotificationEventPublisher } from '../../common/events/notification.publisher';
import { LikeDto, CommentDto } from './dto/interactions.dto';

const prisma = new PrismaClient();

@Injectable()
export class InteractionsService {
  constructor(private readonly publisher: NotificationEventPublisher) {}

  private async verifyTargetTenant(collegeId: string, targetType: string, targetId: string) {
    let target;
    switch (targetType) {
      case 'post':
        target = await prisma.post.findUnique({ where: { id: targetId }, select: { collegeId: true } });
        break;
      case 'story':
        target = await prisma.story.findUnique({ where: { id: targetId }, select: { collegeId: true } });
        break;
      case 'reel':
        target = await prisma.reel.findUnique({ where: { id: targetId }, select: { collegeId: true } });
        break;
      case 'project':
        target = await prisma.project.findUnique({ where: { id: targetId }, select: { collegeId: true } });
        break;
      case 'talent':
        // TalentProfile is keyed by userId originally, but if targetId is the profile id:
        target = await prisma.talentProfile.findUnique({ where: { id: targetId }, select: { collegeId: true } });
        break;
      // Other target types could be added here
      default:
        throw new NotFoundException('Unsupported target type');
    }

    if (!target) throw new NotFoundException(`${targetType} not found`);
    if (target.collegeId !== collegeId) {
      throw new ForbiddenException(`Cannot interact with this ${targetType}`);
    }
  }

  async like(userId: string, collegeId: string, dto: LikeDto) {
    await this.verifyTargetTenant(collegeId, dto.targetType, dto.targetId);

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId },
      },
    });

    if (existingLike) return { success: true };

    await prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: { userId, targetType: dto.targetType, targetId: dto.targetId },
      });

      // Update denormalized counts
      if (dto.targetType === 'post') {
        await tx.post.update({ where: { id: dto.targetId }, data: { likeCount: { increment: 1 } } });
      } else if (dto.targetType === 'story') {
        await tx.story.update({ where: { id: dto.targetId }, data: { likeCount: { increment: 1 } } });
      } else if (dto.targetType === 'reel') {
        await tx.reel.update({ where: { id: dto.targetId }, data: { likeCount: { increment: 1 } } });
      } else if (dto.targetType === 'project') {
        await tx.project.update({ where: { id: dto.targetId }, data: { likeCount: { increment: 1 } } });
      }
    });

    this.publisher.publish(`${dto.targetType}.liked`, { targetId: dto.targetId, actorId: userId });
    return { success: true };
  }

  async unlike(userId: string, collegeId: string, dto: LikeDto) {
    await this.verifyTargetTenant(collegeId, dto.targetType, dto.targetId);

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId },
      },
    });

    if (!existingLike) return { success: true };

    await prisma.$transaction(async (tx) => {
      await tx.like.delete({
        where: { id: existingLike.id },
      });

      if (dto.targetType === 'post') {
        await tx.post.update({ where: { id: dto.targetId }, data: { likeCount: { decrement: 1 } } });
      } else if (dto.targetType === 'story') {
        await tx.story.update({ where: { id: dto.targetId }, data: { likeCount: { decrement: 1 } } });
      } else if (dto.targetType === 'reel') {
        await tx.reel.update({ where: { id: dto.targetId }, data: { likeCount: { decrement: 1 } } });
      } else if (dto.targetType === 'project') {
        await tx.project.update({ where: { id: dto.targetId }, data: { likeCount: { decrement: 1 } } });
      }
    });

    return { success: true };
  }

  async comment(userId: string, collegeId: string, dto: CommentDto) {
    await this.verifyTargetTenant(collegeId, dto.targetType, dto.targetId);

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          content: dto.content,
          parentCommentId: dto.parentCommentId,
        },
      });

      if (dto.targetType === 'post') {
        await tx.post.update({ where: { id: dto.targetId }, data: { commentCount: { increment: 1 } } });
      } else if (dto.targetType === 'reel') {
        await tx.reel.update({ where: { id: dto.targetId }, data: { commentCount: { increment: 1 } } });
      }
      // Note: Story schema doesn't have commentCount right now, we can add it later if needed or calculate dynamically.

      return newComment;
    });

    this.publisher.publish(`${dto.targetType}.commented`, { targetId: dto.targetId, commentId: comment.id, actorId: userId });
    return comment;
  }
}
