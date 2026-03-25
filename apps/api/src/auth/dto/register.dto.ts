import { IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  name: string

  @IsString()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @MinLength(5)
  securityQuestion: string

  @IsString()
  @MinLength(2)
  securityAnswer: string
}
