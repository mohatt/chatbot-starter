import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai'
import type { ChatRecord, ChatProjectRecord } from '@/lib/db'
import type { Api } from '@/lib/api'
import type { AI, ModelKey, ModelUsage } from './index'
import type { ResolvedModelEntry } from './model-config'

export interface ChatMessageModelMetadata {
  model: ModelKey
  usage: ModelUsage
}

export interface ChatMessageUserMetadata {
  [k: string]: never
}

export type ChatMessageMetadata = ChatMessageModelMetadata | ChatMessageUserMetadata

export type ChatMessage = UIMessage<ChatMessageMetadata, {
  notification: {
    message: string;
    level: 'info' | 'warning' | 'error';
  }
}, ChatTools>;

export type ChatToolSet = ReturnType<AI['createChatTools']>

export type ChatTools = InferUITools<ChatToolSet>

export interface ChatToolContext {
  api: Api
  chat: ChatRecord
  model: ResolvedModelEntry
  project?: ChatProjectRecord | null
  dataStream: UIMessageStreamWriter<ChatMessage>;
}
