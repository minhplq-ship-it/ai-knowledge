import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ChatService } from './chat.service'
import { CreateChatDto } from './dto/create-chat.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'
import { Throttle } from '@nestjs/throttler/dist/throttler.decorator'

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // POST /chats — tạo session mới
  @Post()
  create(@Body() dto: CreateChatDto, @Req() req) {
    return this.chatService.createChat(dto, req.user.id)
  }

  // GET /chats — danh sách chat của user
  @Get()
  findAll(@Req() req) {
    return this.chatService.findAllChats(req.user.id)
  }

  // GET /chats/:id/messages — lịch sử tin nhắn
  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Req() req) {
    return this.chatService.getMessages(id, req.user.id)
  }

  // POST /chats/:id/messages — gửi tin nhắn, nhận AI response
  @Post(':id/messages')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req,
  ) {
    return this.chatService.sendMessage(id, dto, req.user.id)
  }

  // DELETE /chats/:id — xóa chat
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.chatService.deleteChat(id, req.user.id)
  }
}
