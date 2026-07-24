import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatePostDto, CreateCommentDto } from './dto/feed.dto';
import { PrismaClient } from '@prisma/client';
import { NotificationEventPublisher } from '../../common/events/notification.publisher';
import { ModerationService } from '../moderation/moderation.service';

const prisma = new PrismaClient();

@Injectable()
export class FeedService {
  constructor(
    private readonly publisher: NotificationEventPublisher,
    private readonly moderationService: ModerationService,
  ) {}

  async createPost(userId: string, collegeId: string, dto: CreatePostDto) {
    const hashtags = this.extractHashtags(dto.content);
    const mentions = this.extractMentions(dto.content);

    // Fire and forget moderation check
    this.moderationService.scanContent({
      targetType: 'post',
      targetId: 'pending-post', // Normally we'd do this after creation or synchronously if we want to block it
      text: dto.content,
      collegeId
    }).catch(e => console.error(e));

    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          authorId: userId,
          collegeId,
          type: dto.type,
          content: dto.content,
        },
      });

      if (dto.mediaUrls && dto.mediaUrls.length > 0) {
        const mediaData = dto.mediaUrls.map((url, i) => ({
          postId: newPost.id,
          mediaId: `mock-media-id-${i}`,
          mediaType: 'image', // simplified for now
          url: url,
          order: i,
        }));
        await tx.postMedia.createMany({ data: mediaData });
      }

      if (hashtags.length > 0) {
        for (const tag of hashtags) {
          const dbTag = await tx.hashtag.upsert({
            where: { tag },
            update: {},
            create: { tag },
          });
          await tx.postHashtag.create({
            data: { postId: newPost.id, hashtagId: dbTag.id },
          });
        }
      }

      if (mentions.length > 0) {
        // Assume mention strings are exact usernames or IDs, for now just store the mention string as mock targetId
        for (const m of mentions) {
          await tx.mention.create({
            data: {
              userId,
              targetType: 'post',
              targetId: newPost.id,
              // In reality we'd look up the user ID from the username
            },
          });
        }
      }

      return newPost;
    });

    if (mentions.length > 0) {
      this.publisher.publish('post.mentioned', { postId: post.id, mentions });
    }

    return post;
  }

  async getFeed(collegeId: string, cursorId?: string, cursorCreatedAt?: Date, limit = 20) {
    const cursorObj = cursorId && cursorCreatedAt ? {
      collegeId_createdAt: {
        collegeId,
        createdAt: cursorCreatedAt,
      }
    } : undefined;

    const posts = await prisma.post.findMany({
      where: { collegeId, deletedAt: null },
      take: limit,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj ? { id: cursorId } : undefined, // In reality, we'd use a unique cursor for pagination. Prisma needs a unique cursor.
      // Wait, to use cursor it must be unique. Let's just use ID as cursor.
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        media: true,
      },
    });

    return posts;
  }

  async getTrending(collegeId: string) {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const posts = await prisma.post.findMany({
      where: {
        collegeId,
        createdAt: { gte: fortyEightHoursAgo },
        deletedAt: null,
      },
      orderBy: [
        { likeCount: 'desc' },
        { commentCount: 'desc' },
      ],
      take: 10,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        media: true,
      },
    });

    return posts;
  }


  async bookmarkPost(userId: string, collegeId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.collegeId !== collegeId) {
      throw new ForbiddenException('Cannot interact with this post');
    }

    await prisma.postBookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });

    return { success: true };
  }

  async unbookmarkPost(userId: string, collegeId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.collegeId !== collegeId) {
      throw new ForbiddenException('Cannot interact with this post');
    }

    try {
      await prisma.postBookmark.delete({
        where: { userId_postId: { userId, postId } },
      });
    } catch (e) {
      // Ignored if it doesn't exist
    }

    return { success: true };
  }

  private extractHashtags(content?: string): string[] {
    if (!content) return [];
    const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
    return Array.from(new Set(matches.map(tag => tag.toLowerCase())));
  }

  private extractMentions(content?: string): string[] {
    if (!content) return [];
    const matches = content.match(/@[a-zA-Z0-9_]+/g) || [];
    return Array.from(new Set(matches.map(mention => mention.substring(1))));
  }
}
