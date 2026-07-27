import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateEventDto, EventInterestDto } from './dto/events.dto';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class EventsService {
  async createEvent(userId: string, collegeId: string, dto: CreateEventDto) {
    return prisma.event.create({
      data: {
        creatorId: userId,
        collegeId,
        title: dto.title,
        category: dto.category,
        description: dto.description,
        venue: dto.venue,
        registrationLink: dto.registrationLink,
        posterMediaId: dto.posterMediaId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async getEvents(collegeId: string, status?: string) {
    const whereClause: any = { collegeId };
    if (status) {
      whereClause.status = status;
    }

    return prisma.event.findMany({
      where: whereClause,
      orderBy: { startsAt: 'asc' },
    });
  }

  async getEvent(collegeId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      }
    });

    if (!event || event.collegeId !== collegeId) {
      throw new NotFoundException('Event not found');
    }

    // Get attendee counts
    const counts = await prisma.eventInterest.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true,
    });

    const metrics = {
      interested: counts.find(c => c.status === 'interested')?._count ?? 0,
      going: counts.find(c => c.status === 'going')?._count ?? 0,
    };

    return { ...event, metrics };
  }

  async setInterest(userId: string, eventId: string, dto: EventInterestDto) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    return prisma.eventInterest.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { status: dto.status },
      create: { userId, eventId, status: dto.status },
    });
  }

  async removeInterest(userId: string, eventId: string) {
    try {
      await prisma.eventInterest.delete({
        where: { userId_eventId: { userId, eventId } },
      });
    } catch (e) {
      // Ignore if not exists
    }
    return { success: true };
  }
}
