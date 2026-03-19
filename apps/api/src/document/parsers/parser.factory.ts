import { Injectable, BadRequestException } from '@nestjs/common'
import { TxtParser } from './txt.parser'
import { PdfParser } from './pdf.parser'
import { DocxParser } from './docx.parser'
import { FileParser } from './parser.interface'

@Injectable()
export class ParserFactory {
  constructor(
    private readonly txtParser: TxtParser,
    private readonly pdfParser: PdfParser,
    private readonly docxParser: DocxParser,
  ) {}

  getParser(file: Express.Multer.File): FileParser {
    const mimeType = file.mimetype

    if (mimeType === 'text/plain') {
      return this.txtParser
    }

    if (mimeType === 'application/pdf') {
      return this.pdfParser
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.docxParser
    }

    throw new BadRequestException('Unsupported file type')
  }
}
