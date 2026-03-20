// src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { UserRepository } from 'src/auth/repositories/user.repository'

import { DocumentRepository } from 'src/document/repositories/document.repository'

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  // ─────────────────────────────────────────────────────────
  // USER MANAGEMENT
  // ─────────────────────────────────────────────────────────

  async getAllUsers() {
    return this.userRepository['prisma'].user.findMany({
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
    })
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id)
    if (!user) throw new NotFoundException(`User ${id} not found`)

    const { passwordHash, ...safeUser } = user
    return safeUser
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findById(id)
    if (!user) throw new NotFoundException(`User ${id} not found`)

    await this.userRepository.delete(id)
    return { message: `User ${id} deleted` }
  }

  // ─────────────────────────────────────────────────────────
  // DOCUMENT MANAGEMENT
  // ─────────────────────────────────────────────────────────

  async getAllDocuments(page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const documents = await this.documentRepository.findMany({
      skip,
      take: limit,
    })

    return { data: documents, page, limit }
  }

  async deleteDocument(id: string) {
    const document = await this.documentRepository.findById(id)
    if (!document) throw new NotFoundException(`Document ${id} not found`)

    await this.documentRepository.delete(id)
    return { message: `Document ${id} deleted` }
  }
}
