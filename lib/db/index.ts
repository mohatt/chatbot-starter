import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  ChatModel,
  ChatProjectModel,
  ChatMessageModel,
  FileModel,
  BillingModel,
  BillingPeriodModel,
  CronJobModel,
  ConfigModel,
} from './models'
import type { Env } from '@/lib/env'
import * as schema from './schema'

export class Db {
  readonly client: NodePgDatabase<typeof schema>
  readonly messages: ChatMessageModel
  readonly chats: ChatModel
  readonly projects: ChatProjectModel
  readonly files: FileModel
  readonly billing: BillingModel
  readonly billingPeriods: BillingPeriodModel
  readonly cronJobs: CronJobModel
  readonly config: ConfigModel

  constructor(env: Pick<Env, 'POSTGRES_URL'>) {
    this.client = drizzle(normalizeConnectionString(env.POSTGRES_URL), { schema })
    this.messages = new ChatMessageModel(this.client)
    this.chats = new ChatModel(this.client)
    this.projects = new ChatProjectModel(this.client)
    this.files = new FileModel(this.client)
    this.billing = new BillingModel(this.client)
    this.billingPeriods = new BillingPeriodModel(this.client)
    this.cronJobs = new CronJobModel(this.client)
    this.config = new ConfigModel(this.client)
  }
}

/**
 * Why this exists:
 * - Neon connection URLs usually include `sslmode=require`.
 * - In pg@8 / pg-connection-string@2, `prefer|require|verify-ca` are treated
 *   as aliases of `verify-full`, but each parse logs a deprecation warning.
 * - On Vercel, that warning appears on many function invocations and pollutes logs.
 *
 * What we do:
 * - Before creating the Drizzle/pg client, rewrite only those legacy sslmode
 *   values to explicit `sslmode=verify-full` (same effective behavior in pg@8).
 * - Leave all other URL forms untouched.
 *
 * Safety:
 * - We do a narrow query-param regex replacement (no URL parsing/serialization),
 *   so host/user/pass/path formatting is never altered.
 */
function normalizeConnectionString(str: string) {
  return str.replace(/([?&])sslmode=(prefer|require|verify-ca)(?=(&|$))/, '$1sslmode=verify-full')
}

export type * from './models'
export * as schema from './schema'
