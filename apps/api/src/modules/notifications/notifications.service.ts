import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { GetNotificationsDto } from './dto/notifications.dto';

const prisma = new PrismaClient();

@Injectable()
export class NotificationsService {
  async getNotifications(userId: string, query: GetNotificationsDto) {
    const where: Prisma.NotificationWhereInput = { userId };
    
    if (query.type) {
      where.type = query.type;
    }

    if (query.group) {
      const now = new Date();
      if (query.group === 'today') {
        where.createdAt = { gte: new Date(now.setHours(0,0,0,0)) };
      } else if (query.group === 'this_week') {
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        const today = new Date(new Date().setHours(0,0,0,0));
        where.createdAt = { gte: lastWeek, lt: today };
      } else if (query.group === 'earlier') {
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        where.createdAt = { lt: lastWeek };
      }
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
