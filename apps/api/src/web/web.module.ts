import { Module } from '@nestjs/common'
import { WebSourceController } from './controllers/web-source.controller'
import { CrawlService } from './services/crawl.service'
import { WebSearchService } from './services/web-search.service'
import { WebParserService } from './services/web-parser.service'
import { WebSourceRepository } from './repositories/web-source.repository'
import { PrismaModule } from 'src/prisma/prisma.module'
import { DocumentModule } from 'src/document/document.module'
import { AuthModule } from 'src/auth/auth.module'

@Module({
  imports: [
    PrismaModule,
    DocumentModule, 
    AuthModule,
  ],
  controllers: [WebSourceController],
  providers: [
    CrawlService,
    WebSearchService,
    WebParserService,
    WebSourceRepository,
  ],
  exports: [WebSearchService], // export để ChatModule dùng
})
export class WebModule {}
