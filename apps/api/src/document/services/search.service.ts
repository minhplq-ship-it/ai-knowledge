import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { EmbeddingService } from 'src/document/services/embedding.service'
import OpenAI from 'openai'

export interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(
    query: string,
    userId: string,
    topK = 8,
  ): Promise<SearchResult[]> {
    const queryVector = await this.embeddingService.embedQuery(query)
    const vectorStr = `[${queryVector.join(',')}]`

    const results = await this.prisma.$queryRaw<SearchResult[]>`
    SELECT
      dc.id                                                AS "chunkId",
      dc."documentId",
      d.title                                              AS "documentTitle",
      dc.content,
      (1 - (e.vector <=> ${vectorStr}::vector))::float8   AS similarity
    FROM "Embedding"     e
    JOIN "DocumentChunk" dc ON dc.id = e."chunkId"
    JOIN "Document"      d  ON d.id  = dc."documentId"
    WHERE d."userId" = ${userId}
      AND (1 - (e.vector <=> ${vectorStr}::vector)) > 0.35
    ORDER BY e.vector <=> ${vectorStr}::vector
    LIMIT ${topK}
  `

    return results
  }

  async ask(
    question: string,
    userId: string,
  ): Promise<{ answer: string; sources: SearchResult[] }> {
    const sources = await this.search(question, userId, 8)

    // Fallback thông minh khi không tìm được chunk liên quan
    if (!sources.length) {
      const fallback = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Bạn là AI assistant. User đang hỏi về knowledge base của họ nhưng không tìm thấy tài liệu liên quan. Hãy thông báo lịch sự và gợi ý họ upload tài liệu liên quan. Trả lời ngắn gọn bằng ngôn ngữ của câu hỏi.`,
          },
          { role: 'user', content: question },
        ],
        max_tokens: 300,
        temperature: 0.3,
      })

      return {
        answer:
          fallback.choices[0].message.content ??
          'Không tìm thấy thông tin liên quan trong knowledge base của bạn.',
        sources: [],
      }
    }

    const context = sources
      .map((s, i) => `[Nguồn ${i + 1} - ${s.documentTitle}]\n${s.content}`)
      .join('\n\n---\n\n')

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Bạn là AI assistant phân tích tài liệu.

NGUYÊN TẮC:
- Ưu tiên trả lời DỰA TRÊN context được cung cấp
- Nếu câu hỏi liên quan gián tiếp, được phép SUY LUẬN MỞ RỘNG hợp lý từ context
- Nếu câu hỏi yêu cầu SO SÁNH, liệt kê điểm giống → khác → kết luận
- Nếu context hoàn toàn không liên quan, trả lời: "Tài liệu của bạn không đề cập đến vấn đề này"
- KHÔNG bịa đặt thông tin không có cơ sở trong context
- Trích dẫn nguồn cụ thể khi sử dụng thông tin (ví dụ: "Theo [Nguồn 1]...")

Trả lời bằng ngôn ngữ của câu hỏi.`,
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nCâu hỏi: ${question}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const answer =
      completion.choices[0].message.content ?? 'Không có câu trả lời.'

    this.logger.log(
      `RAG: question="${question}" → ${sources.length} sources used`,
    )

    return { answer, sources }
  }

  async buildRagContext(query: string, userId: string): Promise<string> {
    const results = await this.search(query, userId, 8)
    if (!results.length) return ''

    return results
      .map((r, i) => `[Nguồn ${i + 1} - ${r.documentTitle}]\n${r.content}`)
      .join('\n\n---\n\n')
  }
}
