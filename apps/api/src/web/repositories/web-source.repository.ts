import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CrawlStatus, Prisma } from '@prisma/client'

@Injectable()
export class WebSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WebSourceCreateInput) {
    return this.prisma.webSource.create({ data })
  }

  async findMany(
    userId: string,
    params: { page: number; limit: number; status?: CrawlStatus },
  ) {
    const { page = 1, limit = 20, status } = params
    const where = { userId, ...(status && { status }) }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.webSource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { documents: true } } },
      }),
      this.prisma.webSource.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async findById(id: string, userId: string) {
    return this.prisma.webSource.findFirst({ where: { id, userId } })
  }

  async updateStatus(
    id: string,
    status: CrawlStatus,
    extra?: { crawledAt?: Date; pageCount?: number },
  ) {
    return this.prisma.webSource.update({
      where: { id },
      data: { status, ...extra },
    })
  }

  async delete(id: string, userId: string) {
    return this.prisma.webSource.deleteMany({ where: { id, userId } })
  }
}
