import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateStatusDto, ResolveReportDto, CreateCollegeDto } from './dto/admin.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class AdminService {
  // ---------------------------------------------------------
  // College Admin Services
  // ---------------------------------------------------------
  async getCollegeStats(collegeId: string) {
    const totalStudents = await prisma.user.count({ where: { collegeId, role: 'student' } });
    const pendingProjects = await prisma.project.count({ where: { collegeId, status: 'pending' } });
    const pendingClubs = await prisma.club.count({ where: { collegeId, status: 'pending' } });
    const openReports = await prisma.report.count({ where: { collegeId, status: 'pending' } });
    
    // Simplistic active today proxy (checking if they updated a session or just total for now)
    const activeToday = await prisma.user.count({ 
      where: { 
        collegeId, 
        updatedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
      } 
    });

    return { totalStudents, activeToday, pendingProjects, pendingClubs, openReports };
  }

  async getPendingProjects(collegeId: string) {
    return prisma.project.findMany({ where: { collegeId, status: 'pending' } });
  }

  async updateProjectStatus(collegeId: string, projectId: string, dto: UpdateStatusDto) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!proj || proj.collegeId !== collegeId) throw new NotFoundException('Project not found');
    return prisma.project.update({ where: { id: projectId }, data: { status: dto.status } });
  }

  async getPendingClubs(collegeId: string) {
    return prisma.club.findMany({ where: { collegeId, status: 'pending' } });
  }

  async updateClubStatus(collegeId: string, clubId: string, dto: UpdateStatusDto) {
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.collegeId !== collegeId) throw new NotFoundException('Club not found');
    return prisma.club.update({ where: { id: clubId }, data: { status: dto.status } });
  }

  async getCollegeReports(collegeId: string) {
    return prisma.report.findMany({ where: { collegeId, status: 'pending' } });
  }

  async resolveReport(collegeId: string, reportId: string, adminId: string, dto: ResolveReportDto) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.collegeId !== collegeId) throw new NotFoundException('Report not found');
    return prisma.report.update({ 
      where: { id: reportId }, 
      data: { status: dto.status, resolvedByAdminId: adminId } 
    });
  }

  // ---------------------------------------------------------
  // Super Admin Services
  // ---------------------------------------------------------

  private async writeAuditLog(adminId: string, action: string, targetType: string, targetId: string, metadataJson: any = {}) {
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action,
        targetType,
        targetId,
        metadataJson
      }
    });
  }

  async getAllColleges(adminId: string) {
    await this.writeAuditLog(adminId, 'READ', 'colleges_list', 'ALL');
    return prisma.college.findMany();
  }

  async createCollege(adminId: string, dto: CreateCollegeDto) {
    const col = await prisma.college.create({ data: { name: dto.name, domain: dto.domain, status: 'active' } });
    await this.writeAuditLog(adminId, 'CREATE', 'college', col.id, { name: dto.name });
    return col;
  }

  async updateCollegeStatus(adminId: string, colId: string, dto: UpdateStatusDto) {
    const col = await prisma.college.update({ where: { id: colId }, data: { status: dto.status } });
    await this.writeAuditLog(adminId, 'UPDATE_STATUS', 'college', colId, { status: dto.status });
    return col;
  }

  async getCrossTenantUsers(adminId: string, query: string) {
    await this.writeAuditLog(adminId, 'READ', 'users_cross_tenant_search', 'SEARCH', { query });
    return prisma.user.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 20
    });
  }

  async getGlobalContentReports(adminId: string) {
    await this.writeAuditLog(adminId, 'READ', 'global_reports', 'ESCALATED');
    return prisma.report.findMany({ where: { status: 'escalated' } });
  }

  async getPlatformAnalytics(adminId: string) {
    await this.writeAuditLog(adminId, 'READ', 'platform_analytics', 'ALL');
    return prisma.platformAnalytics.findMany({
      orderBy: { date: 'desc' },
      take: 30 // Last 30 days
    });
  }
}
