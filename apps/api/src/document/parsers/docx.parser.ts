import { Injectable } from '@nestjs/common'
import { FileParser } from './parser.interface'
import * as mammoth from 'mammoth'

@Injectable()
export class DocxParser implements FileParser {
  async parse(file: Express.Multer.File): Promise<string> {
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    })

    return result.value
  }
}
