import { Module } from '@nestjs/common'
import { DocumentController } from './controllers/document.controller'
import { DocumentService } from './services/document.service'
import { DocumentRepository } from './repositories/document.repository'
import { PrismaService } from 'src/prisma/prisma.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { AuthModule } from 'src/auth/auth.module'


@Module({
  controllers: [DocumentController],
  providers: [DocumentService, DocumentRepository, PrismaService,JwtAuthGuard],
  exports: [DocumentService],
   imports: [
    AuthModule   
  ],
})
export class DocumentModule {}
