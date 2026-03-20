import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe())
  app.use(cookieParser())

  app.enableCors({
    origin: 'http://localhost:3000', // ← port Next.js
    credentials: true,
  })

  await app.listen(3001)
}

bootstrap()
