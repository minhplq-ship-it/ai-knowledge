import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsUrl,
  IsOptional,
  Min,
  Max,
} from 'class-validator'
import { CrawlScope } from '@prisma/client'

export class CreateWebSourceDto {
  @IsUrl()
  url: string

  @IsEnum(CrawlScope)
  @IsOptional()
  scope: CrawlScope = CrawlScope.SUBDOMAIN

  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  pageLimit: number = 200

  @IsBoolean()
  @IsOptional()
  autoRecrawl: boolean = false
}
