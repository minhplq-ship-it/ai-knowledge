import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import * as fs from 'fs'
import * as path from 'path'
import * as handlebars from 'handlebars'

import { VerifyEmailPayload, ForgotPasswordPayload } from './email.interface'

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  })

  private compileTemplate(templateName: string, context: any) {
    const filePath = path.join(__dirname, 'templates', `${templateName}.hbs`)

    const source = fs.readFileSync(filePath, 'utf8')

    const template = handlebars.compile(source)

    return template(context)
  }

  async sendVerifyEmail(payload: VerifyEmailPayload) {
    const html = this.compileTemplate('verify-email', {
      code: payload.code,
      name: payload.name ?? 'User',
    })

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: payload.email,
      subject: 'Verify your email',
      html,
    })
  }
  async sendForgotPasswordEmail(payload: ForgotPasswordPayload) {
    const html = this.compileTemplate('forgot-password', {
      code: payload.code,
      name: payload.name ?? 'User',
    })

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: payload.email,
      subject: 'Reset your password',
      html,
    })
  }
}
