// src/admin/admin.module.ts
import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UserRepository } from 'src/auth/repositories/user.repository'
import { DocumentRepository } from 'src/document/repositories/document.repository'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AuthModule } from 'src/auth/auth.module'

@Module({
  imports: [PrismaModule,AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    UserRepository, 
    DocumentRepository,
  ],
})
export class AdminModule {}
