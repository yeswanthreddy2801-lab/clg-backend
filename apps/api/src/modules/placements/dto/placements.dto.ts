import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsIn, IsArray } from 'class-validator';

export class CreatePlacementExperienceDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['selected', 'rejected', 'in_process'])
  verdict: string;

  @IsArray()
  @IsNotEmpty()
  roundsJson: any[];

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

export class GetPlacementExperiencesDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  @IsIn(['selected', 'rejected', 'in_process'])
  verdict?: string;

  @IsString()
  @IsOptional()
  @IsIn(['upvotes', 'newest'])
  sort?: string;
}

export class CreateReferralRequestDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  message?: string;
}
