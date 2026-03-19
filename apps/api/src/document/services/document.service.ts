import { Injectable } from '@nestjs/common'
import { DocumentRepository } from '../repositories/document.repository'
import { CreateDocumentDto } from '../dto/create-document.dto'
import { QueryDocumentDto } from '../dto/query-document.dto'

@Injectable()
export class DocumentService {
  constructor(private readonly repository: DocumentRepository) {}

  // 🟢 Create document (text)
  async create(dto: CreateDocumentDto, userId: string) {
    return this.repository.create({
      title: dto.title,
      content: dto.content,
      user: {
        connect: { id: userId },
      },
    })
  }

  async findAll(query: QueryDocumentDto, userId: string) {
    const { page = 1, limit = 10 } = query

    return this.repository.findMany({
      skip: (page - 1) * limit,
      take: limit,
      userId,
    })
  }

  // 🟢 Get one
  async findOne(id: string) {
    return this.repository.findById(id)
  }

  // 🟢 Delete
  async remove(id: string) {
    return this.repository.delete(id)
  }
}
