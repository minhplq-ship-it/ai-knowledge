import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { SearchService } from 'src/document/services/search.service'
import { CreateChatDto } from './dto/create-chat.dto'
import { SendMessageDto } from './dto/send-message.dto'
import OpenAI from 'openai'

// Số tin nhắn lấy làm context history — đủ để nhớ ngữ cảnh, không quá dài
const HISTORY_LIMIT = 10

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // CHAT CRUD
  // ─────────────────────────────────────────────────────────

  async createChat(dto: CreateChatDto, userId: string) {
    return this.prisma.chat.create({
      data: {
        title: dto.title ?? 'New chat',
        userId,
      },
    })
  }

  async findAllChats(userId: string) {
    return this.prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        // preview tin nhắn cuối để hiện trên sidebar
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
      where: { id: chatId, userId }, // scope theo userId — security
    })
    if (!chat) throw new NotFoundException('Chat not found')
    return chat
  }

  async getMessages(chatId: string, userId: string) {
    // verify ownership trước
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

  // ─────────────────────────────────────────────────────────
  // SEND MESSAGE — core feature
  // ─────────────────────────────────────────────────────────

  async sendMessage(chatId: string, dto: SendMessageDto, userId: string) {
    // 1. Verify chat ownership
    await this.findOneChat(chatId, userId)

    // 2. Lưu message của user vào DB ngay
    await this.prisma.chatMessage.create({
      data: {
        chatId,
        role: 'USER',
        content: dto.content,
      },
    })

    // 3. Lấy history N tin nhắn gần nhất để gửi kèm cho LLM
    const history = await this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_LIMIT,
    })

    // 4. Semantic search: tìm chunks liên quan trong knowledge base của user
    const ragContext = await this.searchService.buildRagContext(
      dto.content,
      userId,
    )

    // 5. Build messages array gửi cho OpenAI
    const messages = this.buildPrompt(ragContext, history, dto.content)

    // 6. Gọi OpenAI
    this.logger.log(
      `Chat ${chatId}: calling LLM with ${history.length} history msgs, context: ${ragContext ? 'yes' : 'no'}`,
    )

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 1500,
    })

    const assistantContent = completion.choices[0].message.content ?? ''

    // 7. Lưu response của assistant
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: assistantContent,
      },
    })

    // 8. Auto-update chat title từ câu hỏi đầu tiên nếu title vẫn là default
    await this.maybeUpdateChatTitle(chatId, dto.content, history.length)

    return assistantMessage
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────

  private buildPrompt(
    ragContext: string,
    history: { role: string; content: string }[],
    currentQuestion: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const systemPrompt = ragContext
      ? `Bạn là AI assistant thông minh. Trả lời dựa trên context được cung cấp.
Nếu context không đủ thông tin, dùng kiến thức chung nhưng hãy nói rõ.
Trả lời bằng ngôn ngữ của user. Trích dẫn nguồn khi có thể.

=== KNOWLEDGE BASE CONTEXT ===
${ragContext}
=== END CONTEXT ===`
      : `Bạn là AI assistant thông minh. Trả lời bằng ngôn ngữ của user.`

    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history
      // bỏ tin nhắn cuối (chính là câu hỏi vừa lưu) để tránh duplicate
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
    // Chỉ update title ở tin nhắn đầu tiên (history chỉ có 1 = chính nó)
    if (historyLength !== 1) return

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } })
    if (!chat || chat.title !== 'New chat') return

    // Truncate câu hỏi làm title
    const title =
      firstMessage.length > 60
        ? firstMessage.slice(0, 60) + '...'
        : firstMessage

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { title },
    })
  }
}
