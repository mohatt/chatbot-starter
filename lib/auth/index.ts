import { headers } from 'next/headers';
import { createAuthClient } from './client'
import type { NextRequest } from 'next/server'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'

export class Auth {
  readonly client: ReturnType<typeof createAuthClient>

  constructor(db: Db, env: Pick<Env, 'AUTH_SECRET'>) {
    this.client = createAuthClient(db, env)
  }

  async getSession(request?: NextRequest) {
    return this.client.api.getSession(request ?? { headers: await headers() })
  }
}

export type AuthSession = ReturnType<typeof createAuthClient>['$Infer']['Session']
export type AuthUser = AuthSession['user']
