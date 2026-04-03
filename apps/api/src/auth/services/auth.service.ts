import { Injectable, BadRequestException } from '@nestjs/common'
import type { Response } from 'express'
import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { ResetPasswordDto } from '../dto/reset-password.dto'
import { UserRepository } from '../repositories/user.repository'
import { hashPassword, comparePassword } from '../utils/password.util'
import { JwtTokenService } from './jwt-token.service'
import { hashCode, compareCode } from '../utils/otp.util'

@Injectable()
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private jwtService: JwtTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepo.findByEmail(dto.email)
    if (existingUser) throw new BadRequestException('Email already exists')

    const passwordHash = await hashPassword(dto.password)
    const answerHash = await hashCode(dto.securityAnswer.toLowerCase().trim())

    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    })

    await this.userRepo.updateSecurityQuestion(
      user.id,
      dto.securityQuestion,
      answerHash,
    )

    await this.userRepo.updateEmailVerified(user.id)

    return { message: 'Registration successful' }
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) throw new BadRequestException('Invalid credentials')

    const valid = await comparePassword(dto.password, user.passwordHash)
    if (!valid) throw new BadRequestException('Invalid credentials')

    const token = this.jwtService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })

    return { message: 'Login successful' }
  }

  async getSecurityQuestion(email: string) {
    const user = await this.userRepo.findSecurityQuestion(email)
    if (!user) throw new BadRequestException('User not found')
    if (!user.securityQuestion)
      throw new BadRequestException('No security question set')

    return { securityQuestion: user.securityQuestion }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findSecurityQuestion(dto.email)
    if (!user) throw new BadRequestException('User not found')

    const answerHash = user.securityAnswerHash
    if (!answerHash) throw new BadRequestException('No security question set')

    const isValid = await compareCode(
      dto.securityAnswer.toLowerCase().trim(),
      answerHash,
    )
    if (!isValid) throw new BadRequestException('Wrong security answer')

    const passwordHash = await hashPassword(dto.newPassword)
    await this.userRepo.updatePassword(user.id, passwordHash)

    return { message: 'Password reset successfully' }
  }
}
