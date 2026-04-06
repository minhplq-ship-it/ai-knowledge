import { IsEnum, IsInt, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { CrawlStatus } from '@prisma/client'

export class QueryWebSourceDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page: number = 1

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit: number = 10

  @IsEnum(CrawlStatus)
  @IsOptional()
  status?: CrawlStatus
}
