import { Resend, type CreateEmailOptions } from 'resend'
import { v4 as uuidv4 } from 'uuid'
import { config } from '@/lib/config'
import type { Env } from '../env'
import type { DistributiveOmit } from '@tanstack/react-query'
import type { EmailMessage } from './templates'

export type SendEmailOptions = DistributiveOmit<
  CreateEmailOptions,
  'from' | 'subject' | 'react' | 'text' | 'template' | 'html'
>

export class Mailer {
  private readonly _instance?: {
    client: Resend
    fromName: string
    fromAddress: string
  }

  constructor(env: Pick<Env, 'RESEND_API_KEY' | 'EMAIL_SENDER_NAME' | 'EMAIL_SENDER_ADDRESS'>) {
    const { RESEND_API_KEY, EMAIL_SENDER_NAME, EMAIL_SENDER_ADDRESS } = env
    if (!RESEND_API_KEY) {
      return
    }

    if (!EMAIL_SENDER_ADDRESS) {
      throw new Error('Email sender address must be set in environment variables.')
    }

    this._instance = {
      client: new Resend(RESEND_API_KEY),
      fromName: EMAIL_SENDER_NAME ?? config.appName,
      fromAddress: EMAIL_SENDER_ADDRESS,
    }
  }

  get isEnabled() {
    return this._instance != null
  }

  get instance() {
    if (!this._instance) {
      throw new Error('Email client is not enabled.')
    }
    return this._instance
  }

  async send(mail: EmailMessage<string>, options: SendEmailOptions) {
    const { client, fromName, fromAddress } = this.instance
    const { template, key, subject, body } = mail
    const result = await client.emails.send(
      {
        ...options,
        ...(typeof body === 'string' ? { text: body } : { react: body }),
        subject,
        from: `${fromName} <${fromAddress}>`,
        headers: {
          ...options.headers,
          'X-Entity-Ref-ID': uuidv4(),
        },
      },
      { idempotencyKey: key },
    )

    if (result.error) {
      console.error('Failed sending email message:', {
        error: result.error,
        template,
      })
    }

    return result
  }
}

export * from './templates'
