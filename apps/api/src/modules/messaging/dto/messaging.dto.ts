import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['text', 'image', 'voice', 'file'])
  type: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mediaId?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
