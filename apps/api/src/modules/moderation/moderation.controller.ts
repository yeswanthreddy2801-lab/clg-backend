import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ScanContentDto } from './dto/moderation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// This could be restricted to an internal service role in production
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('scan')
  scanContent(@Body() dto: ScanContentDto) {
    // Fire and forget, or return the verdict
    return this.moderationService.scanContent(dto);
  }
}
