import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { WebParserService } from './web-parser.service'
import { WebSourceRepository } from '../repositories/web-source.repository'
import { DocumentProcessingService } from 'src/document/services/document-processing.service'
import { CrawlScope, CrawlStatus } from '@prisma/client'
import axios from 'axios'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
}

const DELAY_MS = 1000

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly webSourceRepo: WebSourceRepository,
    private readonly webParser: WebParserService,
    private readonly documentProcessing: DocumentProcessingService,
  ) {}

  // Gọi async, không await ở controller — chạy ngầm
  async crawl(webSourceId: string, userId: string): Promise<void> {
    const webSource = await this.webSourceRepo.findById(webSourceId, userId)
    if (!webSource) throw new NotFoundException('WebSource not found')

    await this.webSourceRepo.updateStatus(webSourceId, CrawlStatus.CRAWLING)

    try {
      await this.runCrawl(webSource)
      await this.webSourceRepo.updateStatus(webSourceId, CrawlStatus.READY, {
        crawledAt: new Date(),
      })
    } catch (error) {
      this.logger.error(`Crawl failed for ${webSource.url}`, error)
      await this.webSourceRepo.updateStatus(webSourceId, CrawlStatus.ERROR)
    }
  }

  private async runCrawl(webSource: {
    id: string
    url: string
    scope: CrawlScope
    pageLimit: number
    userId: string
  }): Promise<void> {
    const queue: string[] = [webSource.url]
    const visited = new Set<string>()
    let pageCount = 0

    // Xóa documents cũ nếu re-crawl
    await this.prisma.document.deleteMany({
      where: { webSourceId: webSource.id },
    })

    while (queue.length > 0 && pageCount < webSource.pageLimit) {
      const url = queue.shift()!

      if (visited.has(url)) continue
      visited.add(url)

      const html = await this.fetchPage(url)
      if (!html) continue

      const content = this.webParser.parse(html, url)
      if (!content || content.length < 100) {
        this.logger.warn(`Skipping ${url} — content too short`)
        continue
      }

      // Tạo Document — tái dùng pipeline chunk + embed
      const doc = await this.prisma.document.create({
        data: {
          title: url,
          content,
          userId: webSource.userId,
          webSourceId: webSource.id,
        },
      })

      // Chạy ngầm — không await để không block crawl loop
      this.documentProcessing
        .process(doc.id)
        .catch((err) => this.logger.error(`Processing failed for ${url}`, err))

      pageCount++

      // Cập nhật pageCount định kỳ mỗi 10 trang
      if (pageCount % 10 === 0) {
        await this.webSourceRepo.updateStatus(
          webSource.id,
          CrawlStatus.CRAWLING,
          { pageCount },
        )
      }

      // Không follow link nếu SINGLE_PAGE
      if (webSource.scope !== CrawlScope.SINGLE_PAGE) {
        const links = this.webParser.extractLinks(html, url)
        const allowed = links.filter(
          (link) =>
            this.isAllowed(link, webSource.url, webSource.scope) &&
            !visited.has(link),
        )
        queue.push(...allowed)
      }

      await this.delay()
    }

    // Cập nhật pageCount cuối
    await this.webSourceRepo.updateStatus(webSource.id, CrawlStatus.CRAWLING, {
      pageCount,
    })

    this.logger.log(`Crawl done: ${webSource.url} — ${pageCount} pages`)
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, {
        headers: HEADERS,
        timeout: 10000,
        maxRedirects: 3,
      })
      return res.data
    } catch (error) {
      this.logger.warn(`Failed to fetch ${url}: ${error.message}`)
      return null
    }
  }

  private isAllowed(link: string, rootUrl: string, scope: CrawlScope): boolean {
    try {
      const root = new URL(rootUrl)
      const target = new URL(link)

      if (scope === CrawlScope.SUBDOMAIN) {
        return target.hostname === root.hostname
      }

      if (scope === CrawlScope.PATH_PREFIX) {
        return (
          target.hostname === root.hostname &&
          target.pathname.startsWith(root.pathname)
        )
      }

      return false
    } catch {
      return false
    }
  }

  private delay(): Promise<void> {
    return new Promise((r) => setTimeout(r, DELAY_MS + Math.random() * 500))
  }
}
