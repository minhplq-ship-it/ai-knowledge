import { Injectable } from '@nestjs/common'
import { FileParser } from './parser.interface'
import pdf from 'pdf-parse'

@Injectable()
export class PdfParser implements FileParser {
  async parse(file: Express.Multer.File): Promise<string> {
    const data = await pdf(file.buffer)
    return data.text
  }
}
