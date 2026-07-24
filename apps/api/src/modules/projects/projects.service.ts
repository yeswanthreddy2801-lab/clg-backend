import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProjectDto, GetProjectsQueryDto } from './dto/projects.dto';

const prisma = new PrismaClient();

@Injectable()
export class ProjectsService {
  async createProject(userId: string, collegeId: string, dto: CreateProjectDto) {
    return prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          authorId: userId,
          collegeId,
          title: dto.title,
          description: dto.description,
          branch: dto.branch,
          year: dto.year,
          difficulty: dto.difficulty,
          demoLink: dto.demoLink,
          githubLink: dto.githubLink,
          documentationLink: dto.documentationLink,
          videoDemoUrl: dto.videoDemoUrl,
          guideName: dto.guideName,
          status: 'pending', // Defaults to pending
        },
      });

      // Handle techStack
      if (dto.techStack && dto.techStack.length > 0) {
        for (const tech of dto.techStack) {
          const technology = await tx.technology.upsert({
            where: { name: tech.toLowerCase() },
            update: {},
            create: { name: tech.toLowerCase() },
          });

          await tx.projectTechnology.create({
            data: {
              projectId: project.id,
              technologyId: technology.id,
            },
          });
        }
      }

      // Handle teamMembers
      if (dto.teamMembers && dto.teamMembers.length > 0) {
        for (const member of dto.teamMembers) {
          await tx.projectTeamMember.create({
            data: {
              projectId: project.id,
              userId: member.userId,
              roleLabel: member.roleLabel,
            },
          });
        }
      }

      return project;
    });
  }

  async getProjects(collegeId: string, query: GetProjectsQueryDto) {
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const cursor = query.cursor;

    const where: Prisma.ProjectWhereInput = {
      collegeId,
      status: 'approved',
      deletedAt: null,
    };

    if (query.branch) where.branch = query.branch;
    if (query.year) where.year = query.year;
    if (query.difficulty) where.difficulty = query.difficulty;

    if (query.technology) {
      const techArray = Array.isArray(query.technology) ? query.technology : [query.technology];
      where.technologies = {
        some: {
          technology: {
            name: { in: techArray.map(t => t.toLowerCase()) },
          },
        },
      };
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = 
      query.sort === 'popularity' ? { viewCount: 'desc' } : { createdAt: 'desc' };

    const projects = await prisma.project.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        technologies: { include: { technology: true } },
      },
    });

    let nextCursor: string | null = null;
    if (projects.length > limit) {
      const nextItem = projects.pop();
      nextCursor = nextItem!.id;
    }

    return { data: projects, nextCursor };
  }

  async getProject(userId: string, collegeId: string, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        teamMembers: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        technologies: { include: { technology: true } },
        media: true,
      },
    });

    if (!project || project.collegeId !== collegeId || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Visibility Check: Must be approved OR requested by author/team member
    const isAuthor = project.authorId === userId;
    const isTeamMember = project.teamMembers.some((tm) => tm.userId === userId);
    
    if (project.status !== 'approved' && !isAuthor && !isTeamMember) {
      throw new ForbiddenException('Project is pending approval or rejected');
    }

    // Debounce view count (once per user per 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentView = await prisma.projectView.findFirst({
      where: {
        projectId,
        userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (!recentView) {
      await prisma.$transaction([
        prisma.projectView.create({
          data: { projectId, userId },
        }),
        prisma.project.update({
          where: { id: projectId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
      project.viewCount += 1;
    }

    return project;
  }

  async bookmarkProject(userId: string, projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt) throw new NotFoundException('Project not found');

    await prisma.projectBookmark.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: {},
      create: { userId, projectId },
    });
    return { success: true };
  }

  async unbookmarkProject(userId: string, projectId: string) {
    try {
      await prisma.projectBookmark.delete({
        where: { userId_projectId: { userId, projectId } },
      });
    } catch (e) {
      // Ignore if it doesn't exist
    }
    return { success: true };
  }
}
