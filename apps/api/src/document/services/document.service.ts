import { Injectable, BadRequestException } from '@nestjs/common'
import { DocumentRepository } from '../repositories/document.repository'
import { CreateDocumentDto } from '../dto/create-document.dto'
import { QueryDocumentDto } from '../dto/query-document.dto'
import { ParserFactory } from '../parsers/parser.factory'
import { DocumentProcessingService } from './document-processing.service'
@Injectable()
export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly parserFactory: ParserFactory,
    private readonly processingService: DocumentProcessingService,
  ) {}
  async create(dto: { title: string; content?: string }, userId: string) {
    const doc = await this.repository.create({
      title: dto.title,
      content: dto.content,
      user: {
        connect: { id: userId },
      },
    })

    await this.processingService.process(doc.id)

    return doc
  }

  async createFromFile(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('File is required')
    }

    const parser = this.parserFactory.getParser(file)
    const content = await parser.parse(file)

    const doc = await this.repository.create({
      title: file.originalname,
      content,
      user: {
        connect: { id: userId },
      },
    })

    await this.processingService.process(doc.id)

    return doc
  }

  async findAll(query: QueryDocumentDto, userId: string) {
    const { page = 1, limit = 10 } = query

    return this.repository.findMany({
      skip: (page - 1) * limit,
      take: limit,
      userId,
    })
  }

  async findOne(id: string) {
    return this.repository.findById(id)
  }

  async remove(id: string) {
    return this.repository.delete(id)
  }
}
