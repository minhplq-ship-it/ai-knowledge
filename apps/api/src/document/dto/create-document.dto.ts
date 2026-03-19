import { IsOptional, IsString, Length } from 'class-validator'

export class CreateDocumentDto {
  @IsString()
  @Length(1, 255)
  title: string

  @IsOptional()
  @IsString()
  content?: string
}
