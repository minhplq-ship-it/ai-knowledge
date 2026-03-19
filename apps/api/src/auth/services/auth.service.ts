import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'

import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { VerifyEmailDto } from '../dto/verify-email.dto'

import { UserRepository } from '../repositories/user.repository'
import { VerificationRepository } from '../repositories/verification.repository'

import { hashPassword, comparePassword } from '../utils/password.util'
import { JwtTokenService } from './jwt-token.service'
import {
  generateOtp,
  getOtpExpiry,
  hashCode,
  compareCode,
} from '../utils/otp.util'

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
    try {
      const existingUser = await this.userRepo.findByEmail(dto.email)
      if (existingUser) throw new BadRequestException('Email already exists')

      const passwordHash = await hashPassword(dto.password)
      const user = await this.userRepo.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
      })

      // --- Kiểm tra xem user có code EMAIL_VERIFY còn hạn không ---
      const existingCode = await this.verificationRepo.findValidCodeByUser(
        user.id,
        'EMAIL_VERIFY',
      )
      if (existingCode) {
        throw new BadRequestException(
          `You already have a verification code. Please wait until it expires at ${existingCode.expiresAt.toLocaleTimeString()}`,
        )
      }

      // --- Tạo code mới ---
      const code = generateOtp()
      const hashedCode = await hashCode(code)
      const expiresAt = getOtpExpiry(10) // 10 phút

      await this.verificationRepo.create({
        userId: user.id,
        code: hashedCode,
        type: 'EMAIL_VERIFY',
        expiresAt,
      })

      await this.emailService.sendVerifyEmail({
        email: user.email,
        name: user.name,
        code, // gửi plaintext
      })

      return { message: 'Verification email sent' }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(err.message)
    }
  }

  async login(dto: LoginDto) {
    try {
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
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(err.message)
    }
  }
  async verifyEmail(dto: VerifyEmailDto) {
    try {
      const user = await this.userRepo.findByEmail(dto.email)
      if (!user) throw new BadRequestException('User not found')

      const record = await this.verificationRepo.findValidCodeByUser(
        user.id,
        'EMAIL_VERIFY',
      )
      if (!record) throw new BadRequestException('Invalid or expired code')

      const isValid = await compareCode(dto.code, record.code)
      if (!isValid) throw new BadRequestException('Invalid or expired code')

      await this.userRepo.updateEmailVerified(user.id)

      await this.verificationRepo.delete(record.id)

      return { message: 'Email verified successfully' }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(err.message)
    }
  }

  async requestReset(email: string) {
    try {
      const user = await this.userRepo.findByEmail(email)
      if (!user) throw new BadRequestException('User not found')

      const existing = await this.verificationRepo.findValidCodeByUser(
        user.id,
        'PASSWORD_RESET',
      )
      if (existing) {
        throw new BadRequestException(
          `You already have a password reset code. Please wait until it expires at ${existing.expiresAt.toLocaleTimeString()}`,
        )
      }

      const code = generateOtp()
      const hashedCode = await hashCode(code)
      const expiresAt = getOtpExpiry(10) // 10 phút

      await this.verificationRepo.create({
        userId: user.id,
        code: hashedCode,
        type: 'PASSWORD_RESET',
        expiresAt,
      })

      await this.emailService.sendForgotPasswordEmail({
        email: user.email,
        name: user.name,
        code,
      })

      return { message: 'Password reset email sent' }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(err.message)
    }
  }
  async resetPassword(email: string, code: string, newPassword: string) {
    try {
      const user = await this.userRepo.findByEmail(email)
      if (!user) throw new BadRequestException('User not found')

      const record = await this.verificationRepo.findValidCodeByUser(
        user.id,
        'PASSWORD_RESET',
      )
      if (!record) throw new BadRequestException('Invalid or expired code')

      const isValid = await compareCode(code, record.code)
      if (!isValid) throw new BadRequestException('Invalid or expired code')

      const passwordHash = await hashPassword(newPassword)
      await this.userRepo.updatePassword(user.id, passwordHash)

      await this.verificationRepo.delete(record.id)

      return { message: 'Password reset successfully' }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(err.message)
    }
  }
}
