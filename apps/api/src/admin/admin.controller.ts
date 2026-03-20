// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { Roles } from 'src/common/decorators/roles.decorator'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // JWT trước, sau đó check role
@Roles('ADMIN') // toàn bộ controller chỉ ADMIN mới vào được
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/users
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers()
  }

  // GET /admin/users/:id
  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id)
  }

  // DELETE /admin/users/:id
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id)
  }

  // GET /admin/documents?page=1&limit=20
  @Get('documents')
  getAllDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllDocuments(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    )
  }

  // DELETE /admin/documents/:id
  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.adminService.deleteDocument(id)
  }
}
