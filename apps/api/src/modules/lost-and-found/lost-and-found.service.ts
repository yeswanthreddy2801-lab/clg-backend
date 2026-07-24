import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLostFoundReportDto, GetLostFoundReportsDto } from './dto/lost-and-found.dto';

const prisma = new PrismaClient();

@Injectable()
export class LostAndFoundService {
  async createReport(userId: string, collegeId: string, dto: CreateLostFoundReportDto) {
    return prisma.lostFoundReport.create({
      data: {
        reporterId: userId,
        collegeId,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        location: dto.location,
        date: new Date(dto.date),
        mediaId: dto.mediaId,
      },
    });
  }

  async getReports(collegeId: string, query: GetLostFoundReportsDto) {
    const where: Prisma.LostFoundReportWhereInput = { collegeId };
    
    if (query.type) {
      where.type = query.type;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.status) {
      where.status = query.status;
    }

    return prisma.lostFoundReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }

  async resolveReport(userId: string, userRole: string, collegeId: string, reportId: string) {
    const report = await prisma.lostFoundReport.findUnique({ where: { id: reportId } });
    
    if (!report || report.collegeId !== collegeId) {
      throw new NotFoundException('Report not found');
    }

    const isReporter = report.reporterId === userId;
    const isAdmin = ['college_admin', 'super_admin'].includes(userRole);

    if (!isReporter && !isAdmin) {
      throw new ForbiddenException('Only the reporter or an admin can resolve this report');
    }

    return prisma.lostFoundReport.update({
      where: { id: reportId },
      data: { status: 'resolved' },
    });
  }
}
