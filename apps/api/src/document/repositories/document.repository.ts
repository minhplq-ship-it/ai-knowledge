import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DocumentCreateInput) {
    return this.prisma.document.create({
      data,
    })
  }

  async findMany(params: { skip?: number; take?: number; userId?: string }) {
    const { skip, take, userId } = params

    return this.prisma.document.findMany({
      where: userId ? { userId } : {},
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findById(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
    })
  }

  async delete(id: string) {
    return this.prisma.document.delete({
      where: { id },
    })
  }

  async update(id: string, data: Prisma.DocumentUpdateInput) {
    return this.prisma.document.update({
      where: { id },
      data,
    })
  }
}
