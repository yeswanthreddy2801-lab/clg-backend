import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { RequestUploadDto, ConfirmUploadDto } from './dto/media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  getPresignedUrl(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: RequestUploadDto,
  ) {
    return this.mediaService.getPresignedUrl(user.userId, collegeId, dto);
  }

  @Post('confirm')
  confirmUpload(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.mediaService.confirmUpload(user.userId, collegeId, dto);
  }
}
