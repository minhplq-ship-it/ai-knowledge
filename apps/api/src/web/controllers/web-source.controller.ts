import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'
import { WebSourceRepository } from '../repositories/web-source.repository'
import { CrawlService } from '../services/crawl.service'
import { CreateWebSourceDto } from '../dto/create-web-source.dto'
import { QueryWebSourceDto } from '../dto/query-web-source.dto'

@UseGuards(JwtAuthGuard)
@Controller('web-sources')
export class WebSourceController {
  constructor(
    private readonly webSourceRepo: WebSourceRepository,
    private readonly crawlService: CrawlService,
  ) {}

  @Post()
  async create(@Body() dto: CreateWebSourceDto, @Req() req: any) {
    const userId = req.user.id

    const webSource = await this.webSourceRepo.create({
      url: dto.url,
      scope: dto.scope,
      pageLimit: dto.pageLimit,
      autoRecrawl: dto.autoRecrawl,
      user: { connect: { id: userId } },
    })

    // Chạy ngầm, không block response
    this.crawlService.crawl(webSource.id, userId).catch(() => null)

    return webSource
  }

  @Get()
  findAll(@Query() query: QueryWebSourceDto, @Req() req: any) {
    return this.webSourceRepo.findMany(req.user.id, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    })
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.webSourceRepo.findById(id, req.user.id)
  }

  @Post(':id/recrawl')
  @HttpCode(HttpStatus.OK)
  async recrawl(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id
    this.crawlService.crawl(id, userId).catch(() => null)
    return { message: 'Recrawl started' }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.webSourceRepo.delete(id, req.user.id)
  }
}
