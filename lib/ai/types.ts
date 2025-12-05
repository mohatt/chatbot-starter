import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai'
import type { ChatMessageMetadata, ChatRecord } from '@/lib/db'
import type { Api } from '@/lib/api'
import type { AI } from './index'

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
  dataStream: UIMessageStreamWriter<ChatMessage>;
}
