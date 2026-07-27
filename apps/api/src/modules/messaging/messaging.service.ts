import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateConversationDto, SendMessageDto } from './dto/messaging.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class MessagingService {

  async createConversation(userId: string, targetUserId: string, collegeId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot message yourself');
    }

    // Tenant Check
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found');
    
    if (targetUser.collegeId !== collegeId) {
      throw new ForbiddenException('Cross-college messaging is not supported in v1');
    }

    // Block Check
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId }
        ]
      }
    });

    if (block) {
      throw new ForbiddenException('You cannot message this user');
    }

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: userId } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      }
    });

    if (existing) return existing;

    // Create new conversation
    return prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId },
            { userId: targetUserId }
          ]
        }
      }
    });
  }

  async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return conversations.map(c => {
      // Find unread count based on receipts
      // To optimize, this could be a raw query or aggregated field.
      return c;
    });
  }

  async getMessages(userId: string, conversationId: string, cursor?: string) {
    // Access check
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });

    if (!participant) throw new ForbiddenException('Not a participant');

    const take = 20;
    const messages = await prisma.message.findMany({
      where: { conversationId },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        receipts: true
      }
    });

    return {
      messages,
      nextCursor: messages.length === take ? messages[take - 1].id : null
    };
  }

  async saveMessage(userId: string, dto: SendMessageDto) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: dto.conversationId, userId } }
    });

    if (!participant) throw new ForbiddenException('Not a participant');

    // Block check across all participants in this conversation
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId: dto.conversationId, userId: { not: userId } }
    });

    for (const p of otherParticipants) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: p.userId },
            { blockerId: p.userId, blockedId: userId }
          ]
        }
      });
      if (block) throw new ForbiddenException('Cannot send message, block exists');
    }

    const message = await prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        type: dto.type,
        content: dto.content,
        mediaId: dto.mediaId,
        duration: dto.duration
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() }
    });

    return message;
  }
}
