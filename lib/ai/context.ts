import type { UIMessageStreamWriter } from 'ai'
import type { ChatProjectRecord, ChatRecord } from '@/lib/db'
import type { ResolvedModelEntry } from './config'
import type { ModelMeta } from './registery'
import type { Geo } from '@vercel/functions'
import type { Api } from '@/lib/api'
import type { ChatMessage } from './types'

export interface ChatContext {
  api: Api
  chat: ChatRecord
  model: ResolvedModelEntry
  modelMeta: ModelMeta
  project?: ChatProjectRecord | null
  projectFiles?: number | null
  message: ChatMessage
  dataStream: UIMessageStreamWriter<ChatMessage>
  timeZone: string
  location?: Geo
}

export function createChatContext(context: ChatContext) {
  return context
}
