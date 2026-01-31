import type { UIMessage } from 'ai'
import type { gateway } from '@ai-sdk/gateway'
import type { ModelKey } from './config'
import type { ChatTools } from './tools'

export type LanguageModel = ReturnType<typeof gateway>
export type EmbeddingModel = ReturnType<typeof gateway['embeddingModel']>

export interface ModelUsageSchema {
  input?: number
  output?: number
  reasoning?: number
  cacheReads?: number
  cacheWrites?: number
  total?: number
}

export interface ModelUsage {
  cost: ModelUsageSchema
  tokens: ModelUsageSchema
}

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
