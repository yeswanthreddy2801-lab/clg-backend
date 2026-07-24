import { IsString, IsNotEmpty, IsIn, IsOptional, IsUUID } from 'class-validator';

export class LikeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['post', 'story', 'reel', 'project', 'talent'])
  targetType: string;

  @IsUUID(4)
  @IsNotEmpty()
  targetId: string;
}

export class CommentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['post', 'story', 'reel', 'project', 'talent'])
  targetType: string;

  @IsUUID(4)
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID(4)
  @IsOptional()
  parentCommentId?: string;
}
