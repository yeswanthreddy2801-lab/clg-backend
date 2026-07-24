import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SearchService } from '../search/search.service';
import { UpsertTalentProfileDto } from './dto/talent.dto';

const prisma = new PrismaClient();

@Injectable()
export class TalentService {
  constructor(private readonly searchService: SearchService) {}

  async upsertProfile(userId: string, collegeId: string, dto: UpsertTalentProfileDto) {
    const profile = await prisma.talentProfile.upsert({
      where: { userId },
      update: {
        bio: dto.bio,
        skills: dto.skills,
        hourlyRate: dto.hourlyRate,
      },
      create: {
        userId,
        collegeId,
        bio: dto.bio,
        skills: dto.skills || [],
        hourlyRate: dto.hourlyRate,
      },
    });

    // Sync to OpenSearch
    try {
      await this.searchService.indexTalentProfile(profile.id, {
        userId: profile.userId,
        collegeId: profile.collegeId,
        bio: profile.bio,
        skills: profile.skills,
        hourlyRate: profile.hourlyRate,
      });
    } catch (e) {
      // Typically log this and use a fallback retry mechanism
      console.error('Failed to sync to OpenSearch', e);
    }

    return profile;
  }

  async searchTalent(collegeId: string, skills?: string, keyword?: string) {
    const skillsArray = skills ? skills.split(',').map(s => s.trim()) : undefined;
    
    // Use OpenSearch for text and exact match filtering
    return this.searchService.searchTalentProfiles(collegeId, skillsArray, keyword);
  }

  async getProfile(collegeId: string, targetUserId: string) {
    const profile = await prisma.talentProfile.findUnique({
      where: { userId: targetUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!profile || profile.collegeId !== collegeId) {
      throw new NotFoundException('Talent profile not found');
    }

    // Also fetch associated projects
    const projects = await prisma.project.findMany({
      where: { authorId: targetUserId, collegeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { profile, projects };
  }
}
