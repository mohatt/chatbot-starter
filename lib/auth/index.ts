import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'
import { createAuth } from './config'

export class Auth {
  readonly client: ReturnType<typeof createAuth>

  constructor(env: Env, db: Db) {
    this.client = createAuth(db.client, env)
  }
}
