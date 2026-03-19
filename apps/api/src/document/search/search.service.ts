import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { EmbeddingService } from 'src/document/embedding/embedding.service'
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
    topK = 5,
  ): Promise<SearchResult[]> {
    const queryVector = await this.embeddingService.embedQuery(query)
    const vectorStr = `[${queryVector.join(',')}]`

    const results = await this.prisma.$queryRaw<SearchResult[]>`
      SELECT
        dc.id            AS "chunkId",
        dc."documentId",
        d.title          AS "documentTitle",
        dc.content,
        1 - (e.vector <=> ${vectorStr}::vector) AS similarity
      FROM "Embedding"     e
      JOIN "DocumentChunk" dc ON dc.id = e."chunkId"
      JOIN "Document"      d  ON d.id  = dc."documentId"
      WHERE d."userId" = ${userId}
        AND 1 - (e.vector <=> ${vectorStr}::vector) > 0.3
      ORDER BY e.vector <=> ${vectorStr}::vector
      LIMIT ${topK}
    `

    return results
  }

  async ask(
    question: string,
    userId: string,
  ): Promise<{ answer: string; sources: SearchResult[] }> {
    const sources = await this.search(question, userId, 5)

    if (!sources.length) {
      return {
        answer:
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
          content: `Bạn là AI assistant. Trả lời câu hỏi của user DỰA TRÊN context được cung cấp.
Nếu context không đủ thông tin, hãy nói rõ.
Trích dẫn nguồn khi có thể (ví dụ: "Theo [Nguồn 1]...").
Trả lời bằng ngôn ngữ của câu hỏi.`,
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nCâu hỏi: ${question}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const answer =
      completion.choices[0].message.content ?? 'Không có câu trả lời.'
    this.logger.log(
      `RAG: question="${question}" → ${sources.length} sources used`,
    )

    return { answer, sources }
  }
}
