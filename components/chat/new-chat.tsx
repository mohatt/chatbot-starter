'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCreateNewChat, type ChatIdProps, type UseChatResult } from './hooks'
import { ConversationEmptyState } from '@/components/ai-elements/conversation'
import { ChatHeader } from './header'
import { ChatGreeting, ChatSuggestions } from './greeting'
import { ChatPrompt } from './prompt'

export interface NewChatChildProps extends Pick<UseChatResult, 'sendMessage'> {}

export interface NewChatProps extends ChatIdProps {
  children?: ReactNode | ((props: NewChatChildProps) => ReactNode);
}

export function NewChat(props: NewChatProps) {
  const { children, ...newChatProps } = props;
  const createNewChat = useCreateNewChat(newChatProps)
  const router = useRouter()
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim();
  const [isNavigating, setIsNavigating] = useState(false);
  const [model, setModel] = useState('gpt-4o');

  const sendMessage = useCallback<UseChatResult['sendMessage']>(async (...args) => {
    const { url } = createNewChat(args)
    setIsNavigating(true)
    router.push(url)
  }, [router, createNewChat])

  const isQuerySent = useRef(false);
  useEffect(() => {
    if (query && !isQuerySent.current) {
      isQuerySent.current = true;
      const { url } = createNewChat([{ text: query }])
      setIsNavigating(true)
      router.replace(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col">
        <ChatHeader />
        <div className="relative flex-1">
          <div className="absolute inset-0">
            {typeof children === 'function' ? (
              children({ sendMessage })
            ) : (
              children ?? (
                <ConversationEmptyState>
                  <ChatGreeting/>
                  <ChatSuggestions className='md:max-w-3xl mt-4' sendMessage={sendMessage} />
                </ConversationEmptyState>
              )
            )}
          </div>
        </div>
        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 px-2 pb-3 md:px-4 md:pb-4">
          <ChatPrompt
            chatId={props.id}
            model={model}
            setModel={setModel}
            sendMessage={sendMessage}
            stop={async () => {}}
            status='ready'
            isPending={isNavigating}
            isEphemeral
          />
        </div>
      </div>
    </>
  )
}
