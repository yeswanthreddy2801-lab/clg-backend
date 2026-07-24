import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CreateLostFoundReportDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['lost', 'found'])
  type: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  mediaId?: string;
}

export class GetLostFoundReportsDto {
  @IsString()
  @IsOptional()
  @IsIn(['lost', 'found'])
  type?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: string;
}
