import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { LikeDto, CommentDto } from './dto/interactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post('like')
  like(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: LikeDto,
  ) {
    return this.interactionsService.like(user.userId, collegeId, dto);
  }

  @Delete('like')
  unlike(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: LikeDto,
  ) {
    return this.interactionsService.unlike(user.userId, collegeId, dto);
  }

  @Post('comment')
  comment(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Body() dto: CommentDto,
  ) {
    return this.interactionsService.comment(user.userId, collegeId, dto);
  }
}
