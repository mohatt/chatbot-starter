import { drizzle } from 'drizzle-orm/node-postgres'
import { UserModel, ChatModel } from './models'
import type { Env } from '@/lib/env'

export class Db {
  readonly client: ReturnType<typeof drizzle>;
  readonly users: UserModel
  readonly chats: ChatModel

  constructor(env: Env) {
    this.client = drizzle(env.POSTGRES_URL);
    this.users = new UserModel(this.client)
    this.chats = new ChatModel(this.client)

  }
}

export type * from './models';
