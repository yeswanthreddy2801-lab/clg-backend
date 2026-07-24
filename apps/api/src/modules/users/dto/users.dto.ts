import { IsString, IsOptional, IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsOptional()
  socialLinks?: Record<string, any>;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;
}

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @IsIn(['everyone', 'followers', 'none'])
  privacyMessage?: string;

  @IsString()
  @IsOptional()
  @IsIn(['everyone', 'followers', 'none'])
  privacyProfile?: string;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  appearanceDefault?: string;
}
