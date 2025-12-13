import { useChat as useChatSDK, type UseChatHelpers, type UseChatOptions, Chat } from '@ai-sdk/react'
import type { ChatMessage } from '@/lib/ai'

export type UseChatProps = UseChatOptions<ChatMessage>

export type UseChatResult = UseChatHelpers<ChatMessage>

export const useChat = useChatSDK<ChatMessage>
