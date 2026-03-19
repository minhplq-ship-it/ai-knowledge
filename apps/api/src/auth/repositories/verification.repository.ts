import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { VerificationType } from '@prisma/client'

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string
    code: string
    type: VerificationType
    expiresAt: Date
  }) {
    return this.prisma.verificationCode.create({
      data,
    })
  }
  async delete(id: string) {
    return this.prisma.verificationCode.delete({
      where: {
        id,
      },
    })
  }
  async findValidCode(userId: string, code: string, type: VerificationType) {
    return this.prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type,
        expiresAt: {
          gt: new Date(),
        },
      },
    })
  }

  async deleteByUserId(userId: string, type: VerificationType) {
    return this.prisma.verificationCode.deleteMany({
      where: {
        userId,
        type,
      },
    })
  }
  async findValidCodeByUser(userId: string, type: VerificationType) {
    return this.prisma.verificationCode.findFirst({
      where: {
        userId,
        type,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
  async deleteExpired() {
    return this.prisma.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}
