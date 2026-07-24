import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class UpsertTalentProfileDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;
}
