import { IsString, IsNotEmpty, IsNumber, IsIn, Max } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsNumber()
  @Max(50 * 1024 * 1024, { message: 'File size must be under 50MB' })
  size: number;
}

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;
}
