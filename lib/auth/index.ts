import { headers } from 'next/headers'
import { createAuthClient } from './client'
import type { NextRequest } from 'next/server'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'
import type { Mailer } from '@/lib/mailer'

export class Auth {
  readonly client: ReturnType<typeof createAuthClient>

  constructor(env: Pick<Env, 'AUTH_SECRET'>, db: Db, mailer?: Mailer) {
    this.client = createAuthClient(env, db, mailer)
  }

  async getSession(request?: NextRequest) {
    return this.client.api.getSession(request ?? { headers: await headers() })
  }
}

export type AuthSession = ReturnType<typeof createAuthClient>['$Infer']['Session']
export type AuthUser = AuthSession['user']
