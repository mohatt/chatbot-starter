import { useState, useRef, useEffect } from 'react'
import { GlobeIcon, LockIcon } from 'lucide-react'
import type { ChatRecord } from '@/lib/db'

export interface ChatTitleProps {
  chat: Pick<ChatRecord, 'title' | 'privacy' | 'isTitlePending'>
  showPrivacyIcon?: boolean
  msPerChar?: number
}

export function ChatTitle({ chat, showPrivacyIcon, msPerChar = 32 }: ChatTitleProps) {
  const { title, privacy, isTitlePending } = chat
  const [shown, setShown] = useState(title)
  const prevPendingRef = useRef(isTitlePending)
  const lastAnimatedTitleRef = useRef<string | null>(null)

  useEffect(() => {
    const prevPending = prevPendingRef.current
    prevPendingRef.current = isTitlePending

    // While pending: show current title as-is
    if (isTitlePending) {
      setShown(title)
      return
    }

    // Not pending: if we already animated this exact title, just show it
    if (lastAnimatedTitleRef.current === title) {
      setShown(title)
      return
    }

    // Only animate when we transition pending -> not pending
    if (!prevPending) {
      setShown(title)
      return
    }

    // Respect reduced motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      lastAnimatedTitleRef.current = title
      setShown(title)
      return
    }

    setShown('')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(title.slice(0, i))
      if (i >= title.length) {
        window.clearInterval(id)
        lastAnimatedTitleRef.current = title
      }
    }, msPerChar)

    return () => window.clearInterval(id)
  }, [title, isTitlePending, msPerChar])

  const isTyping = !isTitlePending && shown.length < title.length

  return (
    <span className='inline-flex items-center min-w-0'>
      {showPrivacyIcon && (
        <span className='mr-2'>
          {privacy === 'public' ? <GlobeIcon className='size-4' /> : <LockIcon className='size-4' />}
        </span>
      )}
      <span className='truncate min-w-0'>{shown}</span>
      {isTyping && <span className='ml-0.5 animate-pulse'>|</span>}
    </span>
  )
}
