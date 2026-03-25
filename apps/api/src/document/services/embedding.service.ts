import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import OpenAI from 'openai'

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  private readonly EMBED_MODEL = 'text-embedding-3-small'

  constructor(private readonly prisma: PrismaService) {}

  async embedDocument(documentId: string): Promise<void> {
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        documentId,
        embedding: null,
      },
    })

    if (!chunks.length) {
      this.logger.log(`Document ${documentId}: all chunks already embedded`)
      return
    }

    this.logger.log(
      `Document ${documentId}: embedding ${chunks.length} chunks...`,
    )

    try {
      const BATCH_SIZE = 100
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        await this.embedBatch(chunks.slice(i, i + BATCH_SIZE))
      }
      this.logger.log(`Document ${documentId}: embedding complete`)
    } catch (error) {
      this.logger.error(`Document ${documentId}: embedding failed`, error)
      throw error
    }
  }

  private async embedBatch(
    chunks: { id: string; content: string }[],
  ): Promise<void> {
    const texts = chunks.map((c) => this.prepareText(c.content))

    const response = await this.openai.embeddings.create({
      model: this.EMBED_MODEL,
      input: texts,
    })

    // Transaction thay vì Promise.all — tránh race condition
    await this.prisma.$transaction(
      response.data.map((item, idx) => {
        const vector = `[${item.embedding.join(',')}]`
        return this.prisma.$executeRaw`
          INSERT INTO "Embedding" (id, vector, "chunkId")
          VALUES (
            gen_random_uuid(),
            ${vector}::vector,
            ${chunks[idx].id}
          )
          ON CONFLICT ("chunkId") DO UPDATE
            SET vector = EXCLUDED.vector
        `
      }),
    )
  }

  async embedQuery(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.EMBED_MODEL,
      input: this.prepareText(query),
    })
    return response.data[0].embedding
  }

  private prepareText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().slice(0, 8000)
  }
}
