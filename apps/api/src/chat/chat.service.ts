// src/chat/chat.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  SearchService,
  SearchResult,
} from 'src/document/services/search.service'
import { CreateChatDto } from './dto/create-chat.dto'
import { SendMessageDto } from './dto/send-message.dto'
import OpenAI from 'openai'

const HISTORY_LIMIT = 10

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
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

    // Lấy cả sources lẫn context để lưu vào metadata
    const sources = await this.searchService.search(dto.content, userId, 5)
    const ragContext = sources.length
      ? sources
          .map((r, i) => `[Nguồn ${i + 1} - ${r.documentTitle}]\n${r.content}`)
          .join('\n\n---\n\n')
      : ''

    const messages = this.buildPrompt(ragContext, history, dto.content)

    this.logger.log(
      `Chat ${chatId}: ${history.length} history msgs, ${sources.length} sources`,
    )

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 1500,
    })

    const assistantContent = completion.choices[0].message.content ?? ''

    // Lưu sources vào metadata — FE dùng để hiện citation
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: assistantContent,
        metadata: sources.length
          ? {
              sources: sources.map((s) => ({
                chunkId: s.chunkId,
                documentId: s.documentId,
                documentTitle: s.documentTitle,
                content: s.content,
                similarity: s.similarity,
              })),
            }
          : undefined,
      },
    })

    await this.maybeUpdateChatTitle(chatId, dto.content, history.length)

    return assistantMessage
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
