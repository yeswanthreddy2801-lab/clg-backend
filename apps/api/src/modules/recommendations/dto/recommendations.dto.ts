import { IsString, IsNotEmpty } from 'class-validator';

export class SuggestTagsDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
