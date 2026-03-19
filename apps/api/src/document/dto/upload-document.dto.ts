import { IsOptional, IsString, Length } from 'class-validator'

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string
}
