'use client';
import { useRef, useState, useEffect } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { useQueryClient } from '@tanstack/react-query'
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { toast } from 'sonner'
import { DefaultChatTransport } from 'ai'
import { type StickToBottomContext } from 'use-stick-to-bottom';
import { fetchWithOfflineHandler, generateUUID, getTimeZone } from '@/lib/util'
import { LoadingDots } from '@/components/loading'
import { ChatHeader } from './header'
import { ChatMessages } from './messages'
import { ChatPrompt } from './prompt'
import { useChat, useNewChatRef, type ChatIdProps } from './hooks'
import { useChatQuery, useChatHistoryQuery } from '@/api/queries/chats'
import { useNewChatMutation } from '@/api/mutations/chats'
import { CircleAlert } from 'lucide-react'
import { AppError } from '@/lib/errors'
import type { PostRequestBody } from '@/app/(chat)/api/chat/[id]/schema'

export function Chat(props: ChatIdProps) {
  const { id, projectId } = props;
  const newChat = useNewChatRef(props)
  const isNewChat = newChat.current != null
  const [isStoredChat, setIsStoredChat] = useState(!isNewChat)
  const [model, setModel] = useState('gpt-4o');
  const scrollRef = useRef<StickToBottomContext>(null)

  const queryClient = useQueryClient()
  const { mutate: addNewChatToCache } = useNewChatMutation()
  const { data: chatData, error: chatDataError, isLoading: isChatDataLoading } = useChatQuery({
    variables: { id },
    enabled: isStoredChat,
  })
  const { data: historyData, error: historyDataError, isLoading: isHistoryLoading } = useChatHistoryQuery({
    variables: { id },
    enabled: !isNewChat,
  })
  const isDataLoading = isHistoryLoading || (!isNewChat && isChatDataLoading)
  let dataError = chatDataError || historyDataError
  if (chatData && chatData.projectId !== projectId) {
    dataError = new AppError('not_found:chat')
  }

  const { messages, sendMessage, setMessages, status, stop, regenerate, error } = useChat({
    id: id,
    generateId: generateUUID,
    experimental_throttle: 100,
    transport: new DefaultChatTransport({
      api: `/api/chat/${id}`,
      fetch: fetchWithOfflineHandler,
      prepareSendMessagesRequest: useEventCallback((request) => {
        const body: PostRequestBody = {
          message: request.messages.at(-1) as any,
          timeZone: getTimeZone(),
          createChat: !isStoredChat,
          regenerate: request.trigger === 'regenerate-message',
          projectId,
          ...request.body
        }
        return { body }
      })
    }),
    onData: useEventCallback(({ type, data }) => {
      if (type === 'data-notification') {
        toast[data.level](data.message)
      }
    }),
    onFinish: useEventCallback(() => {
      queryClient.setQueryData(useChatHistoryQuery.getKey({ id }), {
        pages: [{ data: [...messages] as any, nextCursor: null }],
        pageParams: [null],
      })
    })
  });

  const sendMessageWithScroll: typeof sendMessage = useEventCallback((...args) => {
    setTimeout(() => {
      scrollRef.current?.scrollToBottom({ ignoreEscapes: true })
    }, 10)
    return sendMessage(...args)
  })

  // Mark new chats as stored when it starts streaming
  const isNewChatStreaming = isNewChat && !isStoredChat && status === 'streaming'
  useEffect(() => {
    if (isNewChatStreaming) {
      setIsStoredChat(true)
    }
  }, [isNewChatStreaming])

  // Send initial chat message for new chats
  const isInitialMessageSent = useRef(false)
  useEffect(() => {
    if (newChat.current && !isInitialMessageSent.current) {
      isInitialMessageSent.current = true
      void sendMessageWithScroll(...newChat.current.initialMessageArgs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist new chat to local cache
  useEffect(() => {
    if (!newChat.current || !isStoredChat) {
      return
    }
    // Use api data if it's fetched, otherwise use temporary new chat data
    const newChatData = chatData ?? newChat.current.chat
    addNewChatToCache(newChatData)
  }, [isStoredChat, chatData, addNewChatToCache])

  // Set message history for existing chats
  useEffect(() => {
    if (!historyData) return
    const historyMessages: any = historyData.pages.flatMap((d) => d.data)
    setMessages((prev) => {
      // If we already have messages (e.g. coming back with a warm Chat store),
      // don't prepend history again and cause duplicates.
      if (prev.length > 0) return prev
      return historyMessages
    })
  }, [historyData])

  if (dataError) {
    return (
      <ConversationEmptyState
        className='text-destructive'
        icon={<CircleAlert className='text-destructive' />}
        title='Unable to load chat data.'
        description={dataError.message}
      />
    )
  }

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col">
        <ChatHeader chat={chatData ?? newChat.current?.chat} />

        <div className="relative flex-1">
          <div className="absolute inset-0">
            <div className="h-full flex min-w-0 flex-col" >
              <Conversation contextRef={scrollRef} initial='instant'>
                {isDataLoading && (
                  <ConversationEmptyState>
                    <LoadingDots className='text-4xl' />
                  </ConversationEmptyState>
                )}
                <ConversationContent className='mx-auto max-w-4xl px-2 py-4 md:px-4 [&>*:last-child]:min-h-40'>
                  <ChatMessages
                    isReadonly={!isStoredChat}
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
            chatId={id}
            model={model}
            setModel={setModel}
            sendMessage={sendMessageWithScroll}
            stop={stop}
            status={status}
            isPending={isDataLoading}
            isEphemeral={!isStoredChat}
          />
        </div>
      </div>
    </>
  );
}
