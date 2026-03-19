// src/document/dto/search.dto.ts
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class SearchDto {
  @IsString()
  @IsOptional()
  query?: string 

  @IsString()
  @IsOptional()
  question?: string 

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  topK?: number = 5
}
