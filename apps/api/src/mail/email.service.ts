// src/mail/email.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import * as fs from 'fs'
import * as path from 'path'
import * as handlebars from 'handlebars'

import { VerifyEmailPayload, ForgotPasswordPayload } from './email.interface'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly resend = new Resend(process.env.RESEND_API_KEY)
  private readonly from =
    process.env.MAIL_FROM ?? 'AI Knowledge <onboarding@resend.dev>'

  private compileTemplate(templateName: string, context: any): string {
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

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: payload.email,
      subject: 'Verify your email',
      html,
    })

    if (error) {
      this.logger.error(
        `Failed to send verify email to ${payload.email}`,
        error,
      )
      throw new Error(error.message)
    }

    this.logger.log(`Verify email sent to ${payload.email}`)
  }

  async sendForgotPasswordEmail(payload: ForgotPasswordPayload) {
    const html = this.compileTemplate('forgot-password', {
      code: payload.code,
      name: payload.name ?? 'User',
    })

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: payload.email,
      subject: 'Reset your password',
      html,
    })

    if (error) {
      this.logger.error(`Failed to send reset email to ${payload.email}`, error)
      throw new Error(error.message)
    }

    this.logger.log(`Reset password email sent to ${payload.email}`)
  }
}
