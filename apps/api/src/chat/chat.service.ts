import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  SearchService,
  SearchResult,
} from 'src/document/services/search.service'
import { WebSearchService } from 'src/web/services/web-search.service'
import { CreateChatDto } from './dto/create-chat.dto'
import { SendMessageDto, SearchMode } from './dto/send-message.dto'
import OpenAI from 'openai'

const HISTORY_LIMIT = 10
const SIMILARITY_THRESHOLD = 0.5

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly webSearchService: WebSearchService,
  ) {}

  async createChat(dto: CreateChatDto, userId: string) {
    return this.prisma.chat.create({
      data: { title: dto.title ?? 'New chat', userId },
    })
  }

  async findAllChats(userId: string) {
    return this.prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    })
  }

  async findOneChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    })
    if (!chat) throw new NotFoundException('Chat not found')
    return chat
  }

  async getMessages(chatId: string, userId: string) {
    await this.findOneChat(chatId, userId)
    return this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async deleteChat(chatId: string, userId: string) {
    await this.findOneChat(chatId, userId)
    return this.prisma.chat.delete({ where: { id: chatId } })
  }

  async sendMessage(chatId: string, dto: SendMessageDto, userId: string) {
    await this.findOneChat(chatId, userId)

    await this.prisma.chatMessage.create({
      data: { chatId, role: 'USER', content: dto.content },
    })

    const history = await this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_LIMIT,
    })

    const { ragContext, sources, searchMode } = await this.buildContext(
      dto.content,
      userId,
      dto.searchMode ?? SearchMode.HYBRID,
    )

    const messages = this.buildPrompt(ragContext, history, dto.content)

    this.logger.log(
      `Chat ${chatId}: mode=${searchMode}, history=${history.length}, sources=${sources.length}`,
    )

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 1500,
    })

    const assistantContent = completion.choices[0].message.content ?? ''

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: assistantContent,
        metadata: {
          searchMode,
          sources: sources.map((s) => ({
            chunkId: s.chunkId,
            documentId: s.documentId,
            documentTitle: s.documentTitle,
            content: s.content,
            similarity: s.similarity,
          })),
        },
      },
    })

    await this.maybeUpdateChatTitle(chatId, dto.content, history.length)

    return assistantMessage
  }

  private async buildContext(
    question: string,
    userId: string,
    searchMode: SearchMode,
  ): Promise<{
    ragContext: string
    sources: SearchResult[]
    searchMode: SearchMode
  }> {
    if (searchMode === SearchMode.DOCUMENT) {
      const sources = await this.searchService.search(question, userId, 5)
      return {
        ragContext: this.formatSources(sources),
        sources,
        searchMode,
      }
    }

    if (searchMode === SearchMode.WEB) {
      const webResults = await this.webSearchService.search(question, 3)
      const ragContext = this.webSearchService.buildContext(webResults)
      // Web results không có chunkId/documentId — map về SearchResult tạm
      const sources = webResults.map((r) => ({
        chunkId: '',
        documentId: '',
        documentTitle: r.title,
        content: r.content,
        similarity: 1,
      }))
      return { ragContext, sources, searchMode }
    }

    // HYBRID — search KB trước, fallback web nếu không đủ tốt
    const sources = await this.searchService.search(question, userId, 5)
    const hasGoodResult = sources.some(
      (s) => s.similarity > SIMILARITY_THRESHOLD,
    )

    if (hasGoodResult) {
      return {
        ragContext: this.formatSources(sources),
        sources,
        searchMode,
      }
    }

    // KB không đủ tốt → fallback web
    this.logger.log(`Hybrid fallback to web search for: "${question}"`)
    const webResults = await this.webSearchService.search(question, 3)
    const webContext = this.webSearchService.buildContext(webResults)
    const webSources = webResults.map((r) => ({
      chunkId: '',
      documentId: '',
      documentTitle: r.title,
      content: r.content,
      similarity: 1,
    }))

    // Gộp cả 2 nếu KB có kết quả dù không đủ tốt
    const allSources = [...sources, ...webSources]
    const allContext = [this.formatSources(sources), webContext]
      .filter(Boolean)
      .join('\n\n---\n\n')

    return { ragContext: allContext, sources: allSources, searchMode }
  }

  private formatSources(sources: SearchResult[]): string {
    if (!sources.length) return ''
    return sources
      .map((r, i) => `[Nguồn ${i + 1} - ${r.documentTitle}]\n${r.content}`)
      .join('\n\n---\n\n')
  }

  private buildPrompt(
    ragContext: string,
    history: { role: string; content: string }[],
    currentQuestion: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const systemPrompt = ragContext
      ? `Bạn là AI assistant. Chỉ trả lời DỰA TRÊN context dưới đây.
Không sử dụng kiến thức bên ngoài context.
Nếu context không có đủ thông tin để trả lời, hãy nói: "Tôi không tìm thấy thông tin này trong tài liệu của bạn."
Trích dẫn nguồn khi có thể. Trả lời bằng ngôn ngữ của user.

=== KNOWLEDGE BASE CONTEXT ===
${ragContext}
=== END CONTEXT ===`
      : `Bạn là AI assistant. Bạn chỉ trả lời dựa trên tài liệu mà user đã upload.
Hiện tại không tìm thấy tài liệu nào liên quan đến câu hỏi này.
Hãy thông báo cho user rằng họ cần upload tài liệu liên quan trước khi hỏi.`

    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history
      .slice(0, -1)
      .map((msg) => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      }))

    return [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: currentQuestion },
    ]
  }

  private async maybeUpdateChatTitle(
    chatId: string,
    firstMessage: string,
    historyLength: number,
  ) {
    if (historyLength !== 1) return
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } })
    if (!chat || chat.title !== 'New chat') return
    const title =
      firstMessage.length > 60
        ? firstMessage.slice(0, 60) + '...'
        : firstMessage
    await this.prisma.chat.update({ where: { id: chatId }, data: { title } })
  }
}
