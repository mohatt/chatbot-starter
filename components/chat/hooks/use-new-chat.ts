'use client';
import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLazyRef } from '@/hooks/use-lazy-ref'
import type { UseChatResult } from './use-chat'

const STORAGE_KEY = 'new-chat'

interface NewChatPayload {
  id: string;
  message: Parameters<UseChatResult['sendMessage']>;
}

function readCurrent(chatId: string) {
  if (typeof window === 'undefined') return null
  const storedValue = window.sessionStorage.getItem(STORAGE_KEY)
  if (!storedValue) return null
  let current: NewChatPayload
  try {
    current = JSON.parse(storedValue)
    if (current.id === chatId && current.message) {
      return current
    }
  } catch {}
  return null
}

export function useNewChat(id: string) {
  const consumeNewChat = useLazyRef(() => {
    const current = readCurrent(id)
    if (!current) return null

    let consumed = false
    return () => {
      if (consumed) return null
      consumed = true
      window.sessionStorage.removeItem(STORAGE_KEY)
      return current.message
    }
  })

  return { hasNewChat: consumeNewChat.current != null, consumeNewChat }
}

export function useNewChatOpener(id: string) {
  const router = useRouter()
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim();
  const isQuerySent = useRef(false);

  const openNewChat = useCallback<UseChatResult['sendMessage']>(async (...message) => {
    const payload: NewChatPayload = { id, message }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    router.push(`/chat/${id}`)
    // `id` isn't allowed to change between renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (query && !isQuerySent.current) {
      isQuerySent.current = true;
      const payload: NewChatPayload = { id, message: [{ text: query }] }
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      router.replace(`/chat/${id}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: UseChatResult['status'] = query ? 'submitted' : 'ready'

  return { status, openNewChat }
}
