import { IsOptional, IsString, Length } from 'class-validator'

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string

  @IsOptional()
  @IsString()
  content?: string
}
