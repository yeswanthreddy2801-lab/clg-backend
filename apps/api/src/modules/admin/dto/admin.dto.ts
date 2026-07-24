import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'rejected', 'suspended'])
  status: string;
}

export class ResolveReportDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['resolved', 'dismissed', 'escalated'])
  status: string;
}

export class CreateCollegeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  domain: string;
}
