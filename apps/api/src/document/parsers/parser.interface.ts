export interface FileParser {
  parse(file: Express.Multer.File): Promise<string>
}
