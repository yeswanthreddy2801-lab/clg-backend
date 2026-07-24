import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProjectDto } from './dto/projects.dto';

const prisma = new PrismaClient();

@Injectable()
export class ProjectsService {

  async createProject(userId: string, collegeId: string, dto: CreateProjectDto) {
    return prisma.project.create({
      data: {
        authorId: userId,
        collegeId,
        title: dto.title,
        description: dto.description,
        tags: dto.tags || [],
        githubLink: dto.repoUrl,
        demoLink: dto.demoUrl,
      },
    });
  }

  async getProjects(collegeId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    return prisma.project.findMany({
      where: { collegeId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getProject(collegeId: string, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!project || project.collegeId !== collegeId || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
