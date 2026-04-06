import { Injectable, Logger } from '@nestjs/common'
import { WebParserService } from './web-parser.service'
import axios from 'axios'

export interface WebSearchResult {
  url: string
  title: string
  content: string
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name)

  private readonly SERPER_API_URL = 'https://google.serper.dev/search'
  private readonly apiKey = process.env.SERPER_API_KEY

  constructor(private readonly webParser: WebParserService) {}

  async search(query: string, topK = 3): Promise<WebSearchResult[]> {
    const urls = await this.getTopUrls(query, topK)
    if (!urls.length) return []

    const results = await Promise.allSettled(
      urls.map((item) => this.fetchAndParse(item.url, item.title)),
    )

    return results
      .filter(
        (r): r is PromiseFulfilledResult<WebSearchResult> =>
          r.status === 'fulfilled' && !!r.value,
      )
      .map((r) => r.value)
  }

  // Dùng để build context nhét vào GPT — không lưu DB
  buildContext(results: WebSearchResult[]): string {
    if (!results.length) return ''
    return results
      .map((r, i) => `[Web ${i + 1} - ${r.title}]\n${r.content}`)
      .join('\n\n---\n\n')
  }

  private async getTopUrls(
    query: string,
    topK: number,
  ): Promise<{ url: string; title: string }[]> {
    try {
      const res = await axios.post(
        this.SERPER_API_URL,
        { q: query, num: topK, hl: 'vi', gl: 'vn' },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )

      return (
        res.data.organic?.slice(0, topK).map((item: any) => ({
          url: item.link,
          title: item.title,
        })) ?? []
      )
    } catch (error) {
      this.logger.error(`Serper API failed: ${error.message}`)
      return []
    }
  }

  private async fetchAndParse(
    url: string,
    title: string,
  ): Promise<WebSearchResult | null> {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 8000,
        maxRedirects: 3,
      })

      const content = this.webParser.parse(res.data, url)
      if (!content || content.length < 100) return null

      // Giới hạn 2000 ký tự mỗi trang — đủ cho context GPT, không quá dài
      return { url, title, content: content.slice(0, 2000) }
    } catch (error) {
      this.logger.warn(`Failed to fetch ${url}: ${error.message}`)
      return null
    }
  }
}
