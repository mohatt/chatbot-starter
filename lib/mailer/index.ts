import { Resend, type CreateEmailOptions } from 'resend'
import type { Env } from '../env'
import type { DistributiveOmit } from '@tanstack/react-query'

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

    if (!EMAIL_SENDER_NAME || !EMAIL_SENDER_ADDRESS) {
      throw new Error('Email sender name and address must be set in environment variables.')
    }

    this._instance = {
      client: new Resend(RESEND_API_KEY),
      fromName: EMAIL_SENDER_NAME,
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

  async send(email: DistributiveOmit<CreateEmailOptions, 'from'>) {
    const { client, fromName, fromAddress } = this.instance
    return await client.emails.send({
      ...email,
      from: `${fromName} <${fromAddress}>`,
    })
  }
}

export * from './templates'
