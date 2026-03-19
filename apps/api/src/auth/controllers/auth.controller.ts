import { Controller, Post, Body, Res } from '@nestjs/common'
import type { Response } from 'express'

import { AuthService } from '../services/auth.service'
import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { VerifyEmailDto } from '../dto/verify-email.dto'
import { ForgotPasswordDto } from '../dto/forgot-password.dto'
import { ResetPasswordDto } from '../dto/reset-password.dto'

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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(dto)

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    })

    return { message: 'Login successful' }
  }
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestReset(dto.email)
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword)
  }
}
