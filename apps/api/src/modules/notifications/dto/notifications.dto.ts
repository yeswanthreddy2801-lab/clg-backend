import { IsString, IsOptional, IsIn } from 'class-validator';

export class GetNotificationsDto {
  @IsString()
  @IsOptional()
  @IsIn(['today', 'this_week', 'earlier'])
  group?: string;

  @IsString()
  @IsOptional()
  type?: string; // like, comment, mention, follow, event, news, etc.
}
