import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional, IsIn } from 'class-validator';

export class CreateMarketplaceListingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaIds?: string[];
}

export class UpdateMarketplaceStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['available', 'sold'])
  status: string;
}

export class GetMarketplaceListingsDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  minPrice?: string;

  @IsString()
  @IsOptional()
  maxPrice?: string;

  @IsString()
  @IsOptional()
  condition?: string;
}
