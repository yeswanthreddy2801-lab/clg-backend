import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsString()
  @IsOptional()
  @IsIn(['all', 'users', 'projects', 'stories', 'posts', 'news', 'events', 'clubs'])
  type?: string = 'all';
}

export class AddRecentSearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}
