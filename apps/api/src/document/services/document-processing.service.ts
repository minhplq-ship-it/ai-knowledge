// src/document/services/document-processing.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { EmbeddingService } from 'src/document/services/embedding.service'
import { PrismaService } from 'src/prisma/prisma.service'

export interface ChunkingConfig {
  maxTokens: number
  overlapTokens: number
  minTokens: number
}

const DEFAULT_CONFIG: ChunkingConfig = {
  maxTokens: 400,
  overlapTokens: 60,
  minTokens: 30,
}

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async process(
    documentId: string,
    config: ChunkingConfig = DEFAULT_CONFIG,
  ): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document?.content?.trim()) {
      this.logger.warn(`Document ${documentId} not found or empty — skipping`)
      return
    }

    const chunks = this.buildChunks(document.content, config)

    if (!chunks.length) {
      this.logger.warn(
        `Document ${documentId} produced 0 chunks after processing`,
      )
      return
    }

    await this.prisma.$transaction([
      this.prisma.documentChunk.deleteMany({ where: { documentId } }),
      this.prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          content: chunk.text,
          chunkIndex: index,
          documentId: document.id,
          metadata: JSON.stringify({
            charStart: chunk.charStart,
            charEnd: chunk.charEnd,
            tokenEstimate: chunk.tokenEstimate,
          }),
          createdAt: new Date(),
        })),
      }),
    ])

    this.logger.log(`Document ${documentId}: processed ${chunks.length} chunks`)
    await this.embeddingService.embedDocument(documentId)
  }

  private buildChunks(raw: string, config: ChunkingConfig): ChunkResult[] {
    const text = this.normalizeText(raw)
    const sentences = this.splitSentences(text)
    return this.packChunksWithOverlap(sentences, config)
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, ' - ')
      .replace(/\n{2,}/g, '\n\n')
      .replace(/([^\n])\n([^\n])/g, '$1 $2')
      .replace(/[^\S\n]+/g, ' ')
      .trim()
  }

  private splitSentences(text: string): string[] {
    const sentences: string[] = []
    const paragraphs = text.split('\n\n')

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) continue

      // Fix: bỏ require uppercase — tiếng Việt hay bắt đầu câu bằng chữ thường
      const raw = trimmed.split(/(?<=[.!?])\s+/)

      for (const s of raw) {
        const clean = s.trim()
        if (clean) sentences.push(clean)
      }
    }

    return sentences
  }

  private packChunksWithOverlap(
    sentences: string[],
    config: ChunkingConfig,
  ): ChunkResult[] {
    const { maxTokens, overlapTokens, minTokens } = config
    const chunks: ChunkResult[] = []

    let window: string[] = []
    let windowTokens = 0
    let charOffset = 0 // track vị trí thực thay vì indexOf

    const flush = () => {
      if (!window.length) return
      const text = window.join(' ').trim()
      const tokenEstimate = this.estimateTokens(text)
      if (tokenEstimate < minTokens) return

      chunks.push({
        text,
        tokenEstimate,
        charStart: charOffset,
        charEnd: charOffset + text.length,
      })
    }

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence)

      if (sentenceTokens > maxTokens) {
        if (window.length) {
          flush()
          window = this.computeOverlapWindow(window, overlapTokens)
          windowTokens = window.reduce((s, w) => s + this.estimateTokens(w), 0)
        }
        const subChunks = this.splitLongSentence(sentence, maxTokens)
        for (const sub of subChunks) {
          chunks.push({
            text: sub,
            tokenEstimate: this.estimateTokens(sub),
            charStart: charOffset,
            charEnd: charOffset + sub.length,
          })
          charOffset += sub.length + 1
        }
        continue
      }

      if (windowTokens + sentenceTokens > maxTokens && window.length) {
        flush()
        window = this.computeOverlapWindow(window, overlapTokens)
        windowTokens = window.reduce((s, w) => s + this.estimateTokens(w), 0)
        charOffset += sentence.length + 1
      }

      window.push(sentence)
      windowTokens += sentenceTokens
    }

    flush()
    return chunks
  }

  private computeOverlapWindow(
    sentences: string[],
    overlapTokens: number,
  ): string[] {
    const result: string[] = []
    let total = 0

    for (let i = sentences.length - 1; i >= 0; i--) {
      const t = this.estimateTokens(sentences[i])
      if (total + t > overlapTokens) break
      result.unshift(sentences[i])
      total += t
    }

    return result
  }

  private splitLongSentence(sentence: string, maxTokens: number): string[] {
    const words = sentence.split(/\s+/)
    const chunks: string[] = []
    let current: string[] = []
    let currentTokens = 0

    for (const word of words) {
      const wordTokens = this.estimateTokens(word)
      if (currentTokens + wordTokens > maxTokens && current.length) {
        chunks.push(current.join(' '))
        current = []
        currentTokens = 0
      }
      current.push(word)
      currentTokens += wordTokens
    }

    if (current.length) chunks.push(current.join(' '))
    return chunks
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3)
  }
}

interface ChunkResult {
  text: string
  tokenEstimate: number
  charStart: number
  charEnd: number
}
