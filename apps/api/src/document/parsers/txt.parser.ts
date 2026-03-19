import { Injectable } from '@nestjs/common'
import { FileParser } from './parser.interface'

@Injectable()
export class TxtParser implements FileParser {
  async parse(file: Express.Multer.File): Promise<string> {
    return file.buffer.toString('utf-8')
  }
}
