import { drizzle } from 'drizzle-orm/node-postgres'
import { ChatModel } from './models'
import type { Env } from '@/lib/env'

export class Db {
  readonly client: ReturnType<typeof drizzle>;
  readonly chats: ChatModel

  constructor(env: Env) {
    this.client = drizzle(env.POSTGRES_URL);
    this.chats = new ChatModel(this.client)
  }
}

export type * from './models';
