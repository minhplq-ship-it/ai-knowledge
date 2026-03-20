import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { DocumentModule } from 'src/document/document.module'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AuthModule } from 'src/auth/auth.module'

@Module({
  imports: [
    PrismaModule,
    DocumentModule, 
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
