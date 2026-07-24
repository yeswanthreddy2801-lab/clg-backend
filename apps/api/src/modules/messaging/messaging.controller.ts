import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/messaging.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('conversations')
  createConversation(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CreateConversationDto
  ) {
    return this.messagingService.createConversation(user.userId, dto.targetUserId, collegeId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: any) {
    return this.messagingService.getConversations(user.userId);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: any,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string
  ) {
    return this.messagingService.getMessages(user.userId, conversationId, cursor);
  }
}
