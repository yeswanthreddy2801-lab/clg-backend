import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreatePlacementExperienceDto, GetPlacementExperiencesDto, CreateReferralRequestDto } from './dto/placements.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class PlacementsService {
  async createExperience(userId: string, collegeId: string, dto: CreatePlacementExperienceDto) {
    return prisma.placementExperience.create({
      data: {
        authorId: userId,
        collegeId,
        company: dto.company,
        role: dto.role,
        verdict: dto.verdict,
        roundsJson: dto.roundsJson,
        isAnonymous: dto.isAnonymous || false,
      },
    });
  }

  async getExperiences(collegeId: string, query: GetPlacementExperiencesDto) {
    const where: Prisma.PlacementExperienceWhereInput = { collegeId };
    
    if (query.company) {
      where.company = query.company;
    }
    if (query.verdict) {
      where.verdict = query.verdict;
    }

    const orderBy: Prisma.PlacementExperienceOrderByWithRelationInput = 
      query.sort === 'upvotes' ? { upvotes: 'desc' } : { createdAt: 'desc' };

    const experiences = await prisma.placementExperience.findMany({
      where,
      orderBy,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // Anonymity stripping logic
    return experiences.map(exp => {
      if (exp.isAnonymous) {
        // Strip author data
        (exp as any).author = { name: 'Anonymous Student' }; 
      }
      return exp;
    });
  }

  async upvoteExperience(userId: string, experienceId: string) {
    const exp = await prisma.placementExperience.findUnique({ where: { id: experienceId } });
    if (!exp) throw new NotFoundException('Experience not found');

    const existing = await prisma.placementUpvote.findUnique({
      where: { userId_experienceId: { userId, experienceId } }
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.placementUpvote.create({ data: { userId, experienceId } }),
        prisma.placementExperience.update({
          where: { id: experienceId },
          data: { upvotes: { increment: 1 } }
        })
      ]);
    }
    return { success: true };
  }

  async removeUpvote(userId: string, experienceId: string) {
    const existing = await prisma.placementUpvote.findUnique({
      where: { userId_experienceId: { userId, experienceId } }
    });

    if (existing) {
      await prisma.$transaction([
        prisma.placementUpvote.delete({
          where: { userId_experienceId: { userId, experienceId } }
        }),
        prisma.placementExperience.update({
          where: { id: experienceId },
          data: { upvotes: { decrement: 1 } }
        })
      ]);
    }
    return { success: true };
  }

  async createReferralRequest(userId: string, collegeId: string, dto: CreateReferralRequestDto) {
    return prisma.placementReferralRequest.create({
      data: {
        userId,
        collegeId,
        company: dto.company,
        role: dto.role,
        message: dto.message,
      },
    });
  }

  async getReferralRequests(collegeId: string) {
    return prisma.placementReferralRequest.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }
}
