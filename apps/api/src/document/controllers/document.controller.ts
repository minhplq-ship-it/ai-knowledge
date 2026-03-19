import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { DocumentService } from '../services/document.service'
import { CreateDocumentDto } from '../dto/create-document.dto'
import { QueryDocumentDto } from '../dto/query-document.dto'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  async create(@Body() dto: CreateDocumentDto, @Req() req) {
    const userId = req.user.id
    console.log('userId:', userId)
    return this.documentService.create(dto, userId)
  }

  @Get()
  async findAll(@Query() query: QueryDocumentDto, @Req() req) {
    const userId = req.user.id

    return this.documentService.findAll(query, userId)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentService.findOne(id)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.documentService.remove(id)
  }
}
