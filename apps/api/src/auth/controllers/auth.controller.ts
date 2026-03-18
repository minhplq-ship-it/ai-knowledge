import { Controller, Post, Body } from '@nestjs/common'

import { AuthService } from '../services/auth.service'

import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { VerifyEmailDto } from '../dto/verify-email.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto)
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}
