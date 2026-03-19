import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './controllers/auth.controller'
import { AuthService } from './services/auth.service'

import { UserRepository } from './repositories/user.repository'
import { VerificationRepository } from './repositories/verification.repository'

import { JwtTokenService } from './services/jwt-token.service'

import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from 'src/mail/email.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as any,
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    UserRepository,
    VerificationRepository,
    PrismaService,
    JwtTokenService,
    EmailService,
    JwtAuthGuard,
  ],

  exports: [JwtTokenService, JwtAuthGuard],
})
export class AuthModule {}
