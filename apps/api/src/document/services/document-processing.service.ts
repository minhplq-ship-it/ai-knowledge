// src/document/services/document-processing.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { EmbeddingService } from 'src/document/services/embedding.service'
import { PrismaService } from 'src/prisma/prisma.service'

/**
 * Cấu hình chunking — tách ra để dễ tune theo từng use case.
 *
 * Gợi ý theo model:
 *  - text-embedding-3-small/large : maxTokens 512, overlap 10%
 *  - nomic-embed-text             : maxTokens 512, overlap 10%
 *  - bge-m3 (multilingual)        : maxTokens 512, overlap 15%
 */
export interface ChunkingConfig {
  /** Token tối đa mỗi chunk (1 token ≈ 4 chars tiếng Anh, ~2-3 chars tiếng Việt) */
  maxTokens: number
  /** Số token overlap giữa các chunk liên tiếp — giữ context ở boundary */
  overlapTokens: number
  /** Token tối thiểu để một chunk được coi là có nghĩa */
  minTokens: number
}

const DEFAULT_CONFIG: ChunkingConfig = {
  maxTokens: 400, // ~400 token → sweet spot cho embedding models
  overlapTokens: 60, // ~15% overlap — đủ để giữ context, không quá dư
  minTokens: 30, // loại bỏ chunk quá ngắn, vô nghĩa
}

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Entry point: idempotent — gọi lại sẽ xóa chunk cũ và tạo lại.
   * Nếu cần incremental update, thêm version/hash check ở đây.
   */
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

    // Idempotent: xóa chunk cũ trước khi insert mới
    // Dùng transaction để đảm bảo atomic — không bao giờ ở trạng thái "nửa xóa nửa tạo"
    await this.prisma.$transaction([
      this.prisma.documentChunk.deleteMany({ where: { documentId } }),
      this.prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          content: chunk.text,
          chunkIndex: index,
          documentId: document.id,
          // Metadata cho filtering và re-ranking khi RAG query
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

  // ─────────────────────────────────────────────────────────────
  // PRIVATE — PIPELINE
  // ─────────────────────────────────────────────────────────────

  private buildChunks(raw: string, config: ChunkingConfig): ChunkResult[] {
    // Step 1: normalize — giữ cấu trúc paragraph, chỉ clean noise
    const text = this.normalizeText(raw)

    // Step 2: split thành sentences — unit cơ bản để chunk
    const sentences = this.splitSentences(text)

    // Step 3: gom sentences thành chunks với overlap
    return this.packChunksWithOverlap(sentences, text, config)
  }

  /**
   * Normalize text:
   * - Giữ paragraph break (double newline) → dùng làm hard boundary khi chunk
   * - Normalize single newline → space (line-wrap trong paragraph)
   * - Clean unicode noise, smart quotes, zero-width chars
   * - KHÔNG flatten toàn bộ xuống 1 dòng như code cũ
   */
  private normalizeText(text: string): string {
    return (
      text
        // Chuẩn hóa line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Zero-width chars và BOM
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
        // Smart quotes → straight quotes
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        // Em dash / en dash → dấu gạch + space để không dính từ
        .replace(/[\u2013\u2014]/g, ' - ')
        // Paragraph break: 2+ newline → sentinel để sau này split
        .replace(/\n{2,}/g, '\n\n')
        // Single newline trong paragraph → space
        .replace(/([^\n])\n([^\n])/g, '$1 $2')
        // Multiple spaces
        .replace(/[^\S\n]+/g, ' ')
        .trim()
    )
  }

  /**
   * Split thành sentences — unit nhỏ nhất để pack vào chunk.
   *
   * Dùng regex phân biệt:
   *  - Dấu chấm kết câu: theo sau là space + uppercase / newline
   *  - Dấu chấm KHÔNG kết câu: số thập phân (3.14), viết tắt (v1.2, e.g.)
   *  - Paragraph break (double newline) → hard boundary sentence
   *
   * Với corpus tiếng Việt nặng, cân nhắc thêm underthesea/pyvi ở tầng
   * Python microservice nếu cần tokenize chuẩn hơn.
   */
  private splitSentences(text: string): string[] {
    const sentences: string[] = []

    // Split theo paragraph trước (hard boundary)
    const paragraphs = text.split('\n\n')

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) continue

      // Split câu trong paragraph
      // Regex: dấu kết câu (. ! ?) theo sau là whitespace + non-lowercase
      // Negative lookbehind cho số (3.14) và chữ thường (e.g. viết tắt)
      const raw = trimmed.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛĂĐƠƯẠ"'(])/)

      for (const s of raw) {
        const clean = s.trim()
        if (clean) sentences.push(clean)
      }
    }

    return sentences
  }

  /**
   * Pack sentences vào chunks với sliding window overlap.
   *
   * Thuật toán:
   *  1. Duyệt sentences, cộng dồn token
   *  2. Khi vượt maxTokens → flush chunk hiện tại
   *  3. Seed chunk tiếp theo bằng N sentences cuối (overlap)
   *  4. Bỏ qua chunk quá ngắn (< minTokens)
   */
  private packChunksWithOverlap(
    sentences: string[],
    originalText: string,
    config: ChunkingConfig,
  ): ChunkResult[] {
    const { maxTokens, overlapTokens, minTokens } = config
    const chunks: ChunkResult[] = []

    let window: string[] = [] // sentences đang gom
    let windowTokens = 0

    const flush = () => {
      if (!window.length) return
      const text = window.join(' ').trim()
      const tokenEstimate = this.estimateTokens(text)
      if (tokenEstimate < minTokens) return // bỏ chunk quá ngắn

      const charStart = originalText.indexOf(text.slice(0, 40)) // approximate
      chunks.push({
        text,
        tokenEstimate,
        charStart: Math.max(0, charStart),
        charEnd: Math.max(0, charStart) + text.length,
      })
    }

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence)

      // Edge case: một câu đơn lẻ đã vượt maxTokens → hard split câu đó
      if (sentenceTokens > maxTokens) {
        if (window.length) {
          flush()
          window = this.computeOverlapWindow(window, overlapTokens)
          windowTokens = window.reduce((s, w) => s + this.estimateTokens(w), 0)
        }
        // Split câu dài theo từ
        const subChunks = this.splitLongSentence(sentence, maxTokens)
        for (const sub of subChunks) {
          chunks.push({
            text: sub,
            tokenEstimate: this.estimateTokens(sub),
            charStart: 0,
            charEnd: sub.length,
          })
        }
        continue
      }

      if (windowTokens + sentenceTokens > maxTokens && window.length) {
        flush()
        // Giữ lại N sentences cuối làm overlap seed cho chunk tiếp theo
        window = this.computeOverlapWindow(window, overlapTokens)
        windowTokens = window.reduce((s, w) => s + this.estimateTokens(w), 0)
      }

      window.push(sentence)
      windowTokens += sentenceTokens
    }

    // Flush chunk cuối
    flush()

    return chunks
  }

  /**
   * Tính overlap window: lấy sentences từ cuối của window hiện tại
   * sao cho tổng token ≤ overlapTokens.
   */
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

  /**
   * Hard split câu quá dài theo word boundary.
   * Fallback khi gặp câu "siêu dài" không có dấu câu (table data, log dump, v.v.)
   */
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

  /**
   * Ước tính token count.
   *
   * Công thức:
   *  - Tiếng Anh: ~4 chars/token
   *  - Tiếng Việt: ~2.5 chars/token (syllable-based, nhiều dấu)
   *  - Mixed: lấy trung bình ~3 chars/token → an toàn hơn về phía
   *    undercount (chunk nhỏ hơn limit thực tế → không bao giờ vượt
   *    context window embedding model)
   *
   * Production: thay bằng tiktoken (npm: js-tiktoken) để chính xác 100%.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3)
  }
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface ChunkResult {
  text: string
  tokenEstimate: number
  charStart: number
  charEnd: number
}
