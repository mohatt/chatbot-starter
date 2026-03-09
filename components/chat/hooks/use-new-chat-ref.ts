'use client'
import { useCallback, type RefObject } from 'react'
import { useLazyRef } from '@/hooks/use-lazy-ref'
import { useAuth } from '@/components/auth-provider'
import { getChatUrl } from '@/lib/utils'
import { config } from '@/lib/config'
import type { UseChatResult } from './use-chat'
import type { ChatRecord } from '@/lib/db'

export type ChatIdProps = Pick<ChatRecord, 'id' | 'projectId'>

export interface NewChatState {
  chat: ChatRecord
  initialMessageArgs: Parameters<UseChatResult['sendMessage']>
}

const newChat: RefObject<NewChatState | null> = {
  current: null,
}

export function useNewChatRef(props: ChatIdProps) {
  const { id, projectId } = props
  return useLazyRef(() => {
    const { current } = newChat
    newChat.current = null
    return current && current.chat.id === id && current.chat.projectId === projectId
      ? current
      : null
  })
}

export function useCreateNewChat(props: ChatIdProps) {
  const { id, projectId } = props
  const { user } = useAuth()
  return useCallback(
    (initialMessageArgs: NewChatState['initialMessageArgs']) => {
      newChat.current = {
        chat: {
          id,
          title: config.chat.title.fallback,
          createdAt: new Date().toISOString(),
          projectId,
          isTitlePending: true,
          privacy: 'private',
          userId: user.id,
        },
        initialMessageArgs,
      }
      return {
        ...newChat.current,
        url: getChatUrl({ id, projectId }),
      }
    },
    [id, projectId, user],
  )
}
