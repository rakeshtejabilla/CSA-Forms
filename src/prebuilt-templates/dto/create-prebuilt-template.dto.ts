import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreatePrebuiltTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  fields?: any[];

  @IsOptional()
  @IsArray()
  conditionalLogic?: any[];

  @IsOptional()
  settings?: any;
}
