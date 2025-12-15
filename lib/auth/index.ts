import { headers } from 'next/headers';
import { createAuthClient } from './client'
import type { NextRequest } from 'next/server'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'

export class Auth {
  readonly client: ReturnType<typeof createAuthClient>

  constructor(
    db: Db,
    env: Pick<Env, 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL'>,
    private readonly request?: NextRequest,
  ) {
    this.client = createAuthClient(db, env)
  }

  async getSession() {
    return this.client.api.getSession(this.request ?? { headers: await headers() })
  }
}

export type AuthSession = ReturnType<typeof createAuthClient>['$Infer']['Session']
export type AuthUser = AuthSession['user']
