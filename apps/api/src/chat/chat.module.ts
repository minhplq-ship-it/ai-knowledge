import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { DocumentModule } from 'src/document/document.module'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AuthModule } from 'src/auth/auth.module'
import { WebModule } from 'src/web/web.module'

@Module({
  imports: [
    PrismaModule,
    DocumentModule, 
    AuthModule,
    WebModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
