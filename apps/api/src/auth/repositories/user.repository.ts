import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({
      data,
    })
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    })
  }
  async updateEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isVerified: true,
      },
    })
  }
  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    })
  }
  async findAllUsers({ skip, take }: { skip: number; take: number }) {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            chats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }
  async updateSecurityQuestion(
    userId: string,
    question: string,
    answerHash: string,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { securityQuestion: question, securityAnswerHash: answerHash },
    })
  }

  async findSecurityQuestion(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        securityQuestion: true,
        securityAnswerHash: true,
      },
    })
  }
}
