'use client';
import { useRef, useState, useEffect } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { toast } from 'sonner'
import { DefaultChatTransport } from 'ai'
import type { StickToBottomContext } from 'use-stick-to-bottom';
import { fetchWithErrorHandlers, generateUUID, getTimeZone } from '@/lib/util'
import { LoadingDots } from '@/components/loading'
import { ChatHeader } from './header'
import { ChatGreeting } from './greeting'
import { ChatMessages } from './messages'
import { ChatPrompt } from './prompt'
import { useNewChat, useNewChatOpener, useChat, useChatApi, useChatHistoryApi } from './hooks'

export interface ChatProps {
  id: string
}

export function Chat({ id }: ChatProps) {
  const { hasNewChat, consumeNewChat } = useNewChat(id)
  const [isPersisted, setIsPersisted] = useState(!hasNewChat)
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState('gpt-4o');
  const [visibility, setVisibility] = useState<any>('private');
  const scrollRef = useRef<StickToBottomContext>(null)

  const { data: chatData } = useChatApi(id, { isPaused: () => !isPersisted });

  const {
    data: historyData,
    isLoading: historyLoading,
    mutate: historyMutate,
  } = useChatHistoryApi(id, { isPaused: () => hasNewChat });

  const { messages, sendMessage, setMessages, status, stop, regenerate, error } = useChat({
    id: id,
    generateId: generateUUID,
    experimental_throttle: 100,
    transport: new DefaultChatTransport({
      api: `/api/chat/${id}`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest: useEventCallback((request) => {
        return {
          body: {
            message: request.messages.at(-1),
            timeZone: getTimeZone(),
            create: !isPersisted,
            regenerate: request.trigger === 'regenerate-message',
            ...request.body
          },
        }
      })
    }),
    onData: useEventCallback(({ type, data }) => {
      setIsPersisted(true)
      if (type === 'data-notification') {
        toast[data.level](data.message)
      }
    }),
    onFinish: useEventCallback(() => {
      console.log('onFinish: cache history')
      void historyMutate([{ data: [...messages] as any }], { revalidate: false })
    })
  });

  const sendMessageWithScroll: typeof sendMessage = useEventCallback((...args) => {
    setTimeout(() => {
      scrollRef.current?.scrollToBottom({ ignoreEscapes: true })
    }, 10)
    return sendMessage(...args)
  })

  useEffect(() => {
    const message = consumeNewChat.current?.()
    if (message) {
      void sendMessageWithScroll(...message)
    }
  }, [])

  useEffect(() => {
    if (!historyData) return
    const historyMessages: any = historyData.flatMap((d) => d.data)
    setMessages((prev) => {
      // If we already have messages (e.g. coming back with a warm Chat store),
      // don't prepend history again and cause duplicates.
      if (prev.length > 0) return prev
      return historyMessages
    })
  }, [historyData])

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          isReadonly={!isPersisted}
          visibilityType={visibility}
          setVisibilityType={setVisibility}
        />

        <div className="relative flex-1">
          <div className="absolute inset-0">
            <div className="h-full flex min-w-0 flex-col" >
              <Conversation contextRef={scrollRef} initial='instant'>
                {historyLoading && (
                  <ConversationEmptyState>
                    <LoadingDots className='text-4xl' />
                  </ConversationEmptyState>
                )}
                <ConversationContent className='mx-auto max-w-4xl px-2 py-4 md:px-4 [&>*:last-child]:min-h-40'>
                  <ChatMessages
                    isReadonly={!isPersisted}
                    messages={messages}
                    regenerate={regenerate}
                    sendMessage={sendMessageWithScroll}
                    status={status}
                    error={error}
                  />
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          <ChatPrompt
            input={input}
            model={model}
            setInput={setInput}
            setModel={setModel}
            sendMessage={sendMessageWithScroll}
            stop={stop}
            hasMessages={messages.length > 0}
            status={historyLoading ? 'submitted' : status}
          />
        </div>
      </div>
    </>
  );
}

export function NewChat({ id }: ChatProps) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState('gpt-4o');
  const { status, openNewChat } = useNewChatOpener(id)
  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          isReadonly
          visibilityType='private'
          setVisibilityType={() => {}}
        />
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <div className="h-full flex min-w-0 flex-col" >
              <ConversationEmptyState>
                <ChatGreeting />
              </ConversationEmptyState>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          <ChatPrompt
            input={input}
            model={model}
            setInput={setInput}
            setModel={setModel}
            sendMessage={openNewChat}
            stop={async () => {}}
            hasMessages={false}
            status={status}
          />
        </div>
      </div>
    </>
  )
}
