import { Injectable, BadRequestException } from '@nestjs/common'

import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { VerifyEmailDto } from '../dto/verify-email.dto'

import { UserRepository } from '../repositories/user.repository'
import { VerificationRepository } from '../repositories/verification.repository'

import { hashPassword, comparePassword } from '../utils/password.util'
import { JwtTokenService } from './jwt-token.service'
import { generateOtp } from '../utils/otp.util'

import { EmailService } from 'src/mail/email.service'

@Injectable()
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private verificationRepo: VerificationRepository,
    private jwtService: JwtTokenService,
    private emailService: EmailService,
  ) {}
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email)

    if (existing) {
      throw new BadRequestException('Email already exists')
    }

    const passwordHash = await hashPassword(dto.password)

    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    })

    const code = generateOtp()

    await this.verificationRepo.create({
      userId: user.id,
      code,
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    await this.emailService.sendVerifyEmail({
      email: user.email,
      name: user.name,
      code,
    })

    return {
      message: 'Verification email sent',
    }
  }
  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email)

    if (!user) {
      throw new BadRequestException('Invalid credentials')
    }

    const valid = await comparePassword(dto.password, user.passwordHash)
    if (!user.isVerified) {
      throw new BadRequestException('Email not verified')
    }
    if (!valid) {
      throw new BadRequestException('Invalid credentials')
    }

    const token = this.jwtService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      accessToken: token,
    }
  }
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userRepo.findByEmail(dto.email)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    const record = await this.verificationRepo.findValidCode(
      user.id,
      dto.code,
      'EMAIL_VERIFY',
    )

    if (!record) {
      throw new BadRequestException('Invalid or expired code')
    }

    await this.userRepo.updateEmailVerified(user.id)

    await this.verificationRepo.delete(record.id)

    return {
      message: 'Email verified successfully',
    }
  }
}
