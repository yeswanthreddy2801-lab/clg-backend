import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Settings Endpoints
  @Get('me/settings')
  getSettings(@CurrentUser() user: any) {
    return this.usersService.getSettings(user.userId);
  }

  @Patch('me/settings')
  updateSettings(@CurrentUser() user: any, @Body() dto: UpdateSettingsDto) {
    return this.usersService.updateSettings(user.userId, dto);
  }

  // Profile Edit
  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  // Block Endpoints
  @Get('me/blocked')
  getBlockedUsers(@CurrentUser() user: any) {
    return this.usersService.getBlockedUsers(user.userId);
  }

  @Post(':id/block')
  blockUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.blockUser(user.userId, targetId);
  }

  @Delete(':id/block')
  unblockUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.unblockUser(user.userId, targetId);
  }

  // Follow Endpoints
  @Post(':id/follow')
  followUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.followUser(user.userId, targetId);
  }

  @Delete(':id/follow')
  unfollowUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.unfollowUser(user.userId, targetId);
  }

  @Get(':id/followers')
  getFollowers(@Param('id') targetId: string) {
    return this.usersService.getFollowers(targetId);
  }

  @Get(':id/following')
  getFollowing(@Param('id') targetId: string) {
    return this.usersService.getFollowing(targetId);
  }

  // Account Management
  @Post('me/deactivate')
  deactivateAccount(@CurrentUser() user: any) {
    return this.usersService.deactivateAccount(user.userId);
  }

  @Post('me/delete-request')
  requestAccountDeletion(@CurrentUser() user: any) {
    return this.usersService.requestAccountDeletion(user.userId);
  }

  // Profile Viewing
  @Get(':id/profile')
  getProfile(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.getProfile(user.userId, targetId);
  }

  @Get(':id/posts')
  getUserPosts(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.getUserPosts(user.userId, targetId);
  }

  @Get(':id/stories')
  getUserStories(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.getUserStories(user.userId, targetId);
  }

  @Get(':id/reels')
  getUserReels(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.getUserReels(user.userId, targetId);
  }

  @Get(':id/projects')
  getUserProjects(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.getUserProjects(user.userId, targetId);
  }
}
