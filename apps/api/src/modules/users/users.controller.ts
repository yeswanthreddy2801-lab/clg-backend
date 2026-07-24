import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCollege } from '../../common/decorators/current-college.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/follow')
  followUser(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') followingId: string,
  ) {
    return this.usersService.followUser(user.userId, collegeId, followingId);
  }

  @Delete(':id/follow')
  unfollowUser(
    @CurrentUser() user: any,
    @CurrentCollege() collegeId: string,
    @Param('id') followingId: string,
  ) {
    return this.usersService.unfollowUser(user.userId, collegeId, followingId);
  }
}
