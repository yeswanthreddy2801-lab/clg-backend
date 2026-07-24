import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roleLabel: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  techStack?: string[];

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Beginner', 'Intermediate', 'Advanced'])
  difficulty?: string;

  @IsUrl()
  @IsOptional()
  demoLink?: string;

  @IsUrl()
  @IsOptional()
  githubLink?: string;

  @IsUrl()
  @IsOptional()
  documentationLink?: string;

  @IsUrl()
  @IsOptional()
  videoDemoUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @IsOptional()
  teamMembers?: TeamMemberDto[];

  @IsString()
  @IsOptional()
  guideName?: string;
}

export class GetProjectsQueryDto {
  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  technology?: string | string[]; // Can be one or multiple depending on query string parsing

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  @IsIn(['newest', 'popularity'])
  sort?: string;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
