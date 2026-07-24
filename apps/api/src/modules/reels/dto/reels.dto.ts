import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReelDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
