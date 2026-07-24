import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, EventInterestDto } from './dto/events.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('college_admin', 'super_admin', 'club_admin')
  createEvent(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user.userId, collegeId, dto);
  }

  @Get()
  getEvents(
    @CurrentCollege() collegeId: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.getEvents(collegeId, status);
  }

  @Get(':id')
  getEvent(
    @CurrentCollege() collegeId: string,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.getEvent(collegeId, eventId);
  }

  @Post(':id/interest')
  setInterest(
    @CurrentUser() user: any,
    @Param('id') eventId: string,
    @Body() dto: EventInterestDto,
  ) {
    return this.eventsService.setInterest(user.userId, eventId, dto);
  }

  @Delete(':id/interest')
  removeInterest(
    @CurrentUser() user: any,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.removeInterest(user.userId, eventId);
  }
}
