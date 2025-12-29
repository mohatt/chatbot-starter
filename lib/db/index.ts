import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { ChatModel, ChatProjectModel, ChatMessageModel, FileModel, BillingModel, BillingPeriodModel } from './models'
import type { Env } from '@/lib/env'
import * as schema from './schema'

export class Db {
  readonly client: NodePgDatabase<typeof schema>;
  readonly messages: ChatMessageModel
  readonly chats: ChatModel
  readonly projects: ChatProjectModel
  readonly files: FileModel
  readonly billing: BillingModel
  readonly billingPeriods: BillingPeriodModel

  constructor(env: Pick<Env, 'POSTGRES_URL'>) {
    this.client = drizzle(env.POSTGRES_URL, { schema });
    this.messages = new ChatMessageModel(this.client)
    this.chats = new ChatModel(this.client)
    this.projects = new ChatProjectModel(this.client)
    this.files = new FileModel(this.client)
    this.billing = new BillingModel(this.client)
    this.billingPeriods = new BillingPeriodModel(this.client)
  }
}

export type * from './models';
export * as schema from './schema';
