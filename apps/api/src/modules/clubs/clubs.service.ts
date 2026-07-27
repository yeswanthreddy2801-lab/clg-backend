import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateClubDto, CreateRecruitmentPostDto, ApplyRecruitmentDto } from './dto/clubs.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class ClubsService {
  async createClub(userId: string, collegeId: string, dto: CreateClubDto) {
    return prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          collegeId,
          name: dto.name,
          description: dto.description,
          logoUrl: dto.logoUrl,
          coverUrl: dto.coverUrl,
          status: 'pending', // Starts as pending
        },
      });

      // The creator becomes the initial club admin
      await tx.clubMembership.create({
        data: {
          clubId: club.id,
          userId,
          role: 'admin',
        },
      });

      return club;
    });
  }

  async getClubs(collegeId: string) {
    return prisma.club.findMany({
      where: {
        collegeId,
        status: 'approved',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  async getClub(collegeId: string, clubId: string) {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: { memberships: true },
        },
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!club || club.collegeId !== collegeId) {
      throw new NotFoundException('Club not found');
    }

    if (club.status !== 'approved') {
      throw new ForbiddenException('Club is not yet approved');
    }

    return club;
  }

  async joinClub(userId: string, clubId: string) {
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.status !== 'approved') {
      throw new NotFoundException('Club not found or not approved');
    }

    return prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId, userId } },
      update: {},
      create: { clubId, userId, role: 'member' },
    });
  }

  async leaveClub(userId: string, clubId: string) {
    try {
      await prisma.clubMembership.delete({
        where: { clubId_userId: { clubId, userId } },
      });
    } catch (e) {
      // Ignore
    }
    return { success: true };
  }

  async createRecruitmentPost(userId: string, clubId: string, dto: CreateRecruitmentPostDto) {
    const membership = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Only club admins can post recruitment');
    }

    return prisma.clubRecruitmentPost.create({
      data: {
        clubId,
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });
  }

  async applyForRecruitment(userId: string, postId: string, dto: ApplyRecruitmentDto) {
    const post = await prisma.clubRecruitmentPost.findUnique({ where: { id: postId } });
    if (!post || !post.isOpen) {
      throw new NotFoundException('Recruitment post not found or closed');
    }

    return prisma.clubRecruitmentApplication.create({
      data: {
        postId,
        userId,
        message: dto.message,
      },
    });
  }
}
