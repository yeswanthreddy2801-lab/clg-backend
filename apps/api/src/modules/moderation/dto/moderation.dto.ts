import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ScanContentDto {
  @IsString()
  @IsNotEmpty()
  targetType: string;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  collegeId?: string; // If null, escalates to super_admin instead of college_admin
}
