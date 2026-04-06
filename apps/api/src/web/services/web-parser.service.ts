import { Injectable, Logger } from '@nestjs/common'
import * as cheerio from 'cheerio'

const CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '.content',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.docs-content',
  '#content',
  '#main',
]

const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'iframe',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '[class*="sidebar"]',
  '[class*="menu"]',
  '[class*="cookie"]',
  '[class*="popup"]',
  '[class*="banner"]',
  '[class*="ad-"]',
  '[id*="sidebar"]',
  '[id*="footer"]',
  '[id*="header"]',
]

@Injectable()
export class WebParserService {
  private readonly logger = new Logger(WebParserService.name)

  parse(html: string, url: string): string {
    try {
      const $ = cheerio.load(html)

      // Xóa noise trước
      NOISE_SELECTORS.forEach((sel) => $(sel).remove())

      // Tìm main content theo priority
      for (const sel of CONTENT_SELECTORS) {
        const el = $(sel)
        if (el.length && el.text().trim().length > 200) {
          return this.cleanText(el.text())
        }
      }

      // Fallback: lấy body
      this.logger.warn(
        `No main content selector matched for ${url}, falling back to body`,
      )
      return this.cleanText($('body').text())
    } catch (error) {
      this.logger.error(`Failed to parse HTML from ${url}`, error)
      return ''
    }
  }

  extractLinks(html: string, baseUrl: string): string[] {
    try {
      const $ = cheerio.load(html)
      const base = new URL(baseUrl)
      const links = new Set<string>()

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href) return

        try {
          const url = new URL(href, base)

          // Chỉ lấy http/https, bỏ mailto/tel/javascript
          if (!['http:', 'https:'].includes(url.protocol)) return

          // Bỏ fragment (#section)
          url.hash = ''

          links.add(url.toString())
        } catch {
          // href không parse được → bỏ qua
        }
      })

      return Array.from(links)
    } catch (error) {
      this.logger.error(`Failed to extract links from ${baseUrl}`, error)
      return []
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
}
