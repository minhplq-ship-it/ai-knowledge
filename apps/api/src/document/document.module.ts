import { Module } from '@nestjs/common'
import { DocumentController } from './controllers/document.controller'
import { DocumentService } from './services/document.service'
import { DocumentRepository } from './repositories/document.repository'
import { PrismaService } from 'src/prisma/prisma.service'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'
import { AuthModule } from 'src/auth/auth.module'
import { ParserFactory } from './parsers/parser.factory'
import { DocxParser } from './parsers/docx.parser'
import { PdfParser } from './parsers/pdf.parser'
import { TxtParser } from './parsers/txt.parser'
import { DocumentProcessingService } from './services/document-processing.service'
import { SearchService } from './services/search.service'
import { EmbeddingService } from './services/embedding.service'

@Module({
  controllers: [DocumentController],
  providers: [
    DocumentService,
    DocumentRepository,
    PrismaService,
    JwtAuthGuard,
    TxtParser,
    PdfParser,
    DocxParser,
    ParserFactory,
    DocumentProcessingService,
    EmbeddingService,
    SearchService,
  ],
  exports: [DocumentService, SearchService],
  imports: [AuthModule],
})
export class DocumentModule {}
