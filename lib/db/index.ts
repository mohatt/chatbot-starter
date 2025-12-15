import { drizzle } from 'drizzle-orm/node-postgres'
import { ChatModel, ChatProjectModel, ChatMessageModel } from './models'
import type { Env } from '@/lib/env'

export class Db {
  readonly client: ReturnType<typeof drizzle>;
  readonly messages: ChatMessageModel
  readonly chats: ChatModel
  readonly projects: ChatProjectModel

  constructor(env: Pick<Env, 'POSTGRES_URL'>) {
    this.client = drizzle(env.POSTGRES_URL);
    this.messages = new ChatMessageModel(this.client)
    this.chats = new ChatModel(this.client)
    this.projects = new ChatProjectModel(this.client)
  }
}

export type * from './models';
export * as schema from './schema';
