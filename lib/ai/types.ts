import type { UIMessage } from 'ai'
import type { gateway } from '@ai-sdk/gateway'
import type { ModelKey } from './config'
import type { ModelUsage } from './registery'
import type { ChatTools } from './tools'

export type LanguageModel = ReturnType<typeof gateway>
export type EmbeddingModel = ReturnType<typeof gateway['embeddingModel']>

export interface ChatMessageMetadata {
  model?: ModelKey
}

export type ChatMessage = UIMessage<ChatMessageMetadata, {
  notification: {
    message: string;
    level: 'info' | 'warning' | 'error';
  }
  usage: ModelUsage
}, ChatTools>;
