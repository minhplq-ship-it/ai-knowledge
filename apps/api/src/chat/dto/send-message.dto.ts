import { IsEnum, IsOptional, IsString } from 'class-validator'

export enum SearchMode {
  DOCUMENT = 'document',
  WEB = 'web',
  HYBRID = 'hybrid',
}

export class SendMessageDto {
  @IsString()
  content: string

  @IsEnum(SearchMode)
  @IsOptional()
  searchMode: SearchMode = SearchMode.HYBRID // default hybrid
}
