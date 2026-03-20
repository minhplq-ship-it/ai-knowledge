import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DocumentModule } from './document/document.module'
import { ChatModule } from './chat/chat.module'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { CustomThrottlerGuard } from './common/guards/throttler.guard'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    AuthModule,
    DocumentModule,
    ChatModule,
    AdminModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100, 
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [Reflector, {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,  
    },],
})
export class AppModule {}
