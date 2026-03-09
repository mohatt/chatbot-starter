'use client'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { toast } from 'sonner'
import { DefaultChatTransport } from 'ai'
import { fetchWithOfflineHandler, generateUUID, getTimeZone } from '@/lib/utils'
import { LoadingDots } from '@/components/loading'
import { ChatLayout } from './layout'
import { ChatMessages } from './messages'
import { ChatPrompt } from './prompt'
import { useChat, useNewChatRef, type ChatIdProps } from './hooks'
import { useClientSettings } from '@/hooks/use-client-settings'
import { usePageTitle } from '@/hooks/use-page-title'
import { useChatQuery, useChatHistoryQuery, useNewChatMutation } from '@/api-client/hooks/chats'
import { useUserBillingPeriodQuery } from '@/api-client/hooks/user'
import { CircleAlert } from 'lucide-react'
import { ChatTree } from '@/lib/ai/chat-tree'
import { AppError } from '@/lib/errors'
import type { StickToBottomContext } from 'use-stick-to-bottom'
import type { PostRequestBody } from '@/app/(chat)/api/chat/[id]/schema'
import type { ModelUsage, ChatMessage } from '@/lib/ai'

export function Chat(props: ChatIdProps) {
  const { id, projectId } = props
  const newChat = useNewChatRef(props)
  const isNewChat = newChat.current != null
  const [isStoredChat, setIsStoredChat] = useState(!isNewChat)
  const scrollRef = useRef<StickToBottomContext>(null)

  const chatTree = useRef(new ChatTree())
  const [chatPath, setChatPath] = useState<ChatMessage[]>([])
  const isLiveChatPath = useMemo(() => {
    const currentLeafId = chatPath.at(-1)?.id ?? null
    const liveLeafId = chatTree.current.getLatestNodeId()
    return currentLeafId === liveLeafId
  }, [chatPath])

  const queryClient = useQueryClient()
  const { data: settings } = useClientSettings()
  const { mutate: addNewChatToCache } = useNewChatMutation()
  const { user } = useAuth()
  const {
    data: chatData,
    error: chatDataError,
    isLoading: isChatDataLoading,
  } = useChatQuery({
    variables: { id },
    enabled: isStoredChat,
  })
  const {
    data: history,
    error: historyError,
    isLoading: isHistoryLoading,
  } = useChatHistoryQuery({
    variables: { id },
    enabled: !isNewChat,
  })
  const activeChatData = chatData ?? newChat.current?.chat
  const isDataLoading = isHistoryLoading || (!isNewChat && isChatDataLoading)
  let dataError = chatDataError || historyError
  if (chatData && chatData.projectId !== projectId) {
    dataError = new AppError('not_found:chat')
  }

  const [modelUsageMap, setModelUsageMap] = useState<Record<string, ModelUsage>>({})
  const { messages, sendMessage, setMessages, status, stop, regenerate, error } = useChat({
    id,
    generateId: generateUUID,
    experimental_throttle: 100,
    transport: new DefaultChatTransport({
      api: `/api/chat/${id}`,
      fetch: fetchWithOfflineHandler,
      prepareSendMessagesRequest: useEventCallback((req) => {
        const body: PostRequestBody = {
          message: req.messages.at(-1) as any,
          timeZone: getTimeZone(),
          createChat: !isStoredChat,
          regenerate: req.trigger === 'regenerate-message' || req.messageId != null,
          model: settings.chatModel.key,
          projectId,
          ...req.body,
        }
        return { body }
      }),
    }),
    onData: useEventCallback(({ type, data }) => {
      if (type === 'data-notification') {
        toast[data.level](data.message)
        return
      }
      if (type === 'data-usage') {
        const lastMsg = messages.at(-1)
        if (lastMsg?.role === 'assistant') {
          setModelUsageMap((prev) => ({
            ...prev,
            [lastMsg.id]: data,
          }))
        }
      }
    }),
    onFinish: useEventCallback(() => {
      queryClient.invalidateQueries({
        queryKey: useUserBillingPeriodQuery.getKey(),
      })
    }),
  })
  const isReadonly =
    !isStoredChat ||
    status === 'streaming' ||
    status === 'submitted' ||
    chatData?.userId !== user.id
  const statusRef = useRef(status)
  statusRef.current = status

  const handleSendMessage = useCallback<typeof sendMessage>(
    (...args) => {
      setTimeout(() => {
        scrollRef.current?.scrollToBottom({ ignoreEscapes: true })
      }, 10)
      return sendMessage(...args)
    },
    [sendMessage],
  )

  const handleRegenerate = useCallback<typeof regenerate>(
    async (args) => {
      if (isReadonly) {
        return
      }
      const { messageId, ...options } = args ?? {}
      const resolvedMessageId = messageId ?? chatTree.current.getLatestNodeId('assistant')
      if (!resolvedMessageId) {
        throw new Error('No assistant message to regenerate')
      }
      const { role, metadata } = chatTree.current.getNodeById(resolvedMessageId)
      if (role !== 'assistant' || !metadata.parentId) {
        throw new Error('Invalid assistant message ID to regenerate')
      }
      const parentMessage = chatTree.current.getNodeById(metadata.parentId)
      setChatPath(chatTree.current.buildPathFromLeafNode(parentMessage.id))
      try {
        return await handleSendMessage(
          {
            messageId: parentMessage.id,
            metadata: parentMessage.metadata,
            parts: parentMessage.parts,
          },
          options,
        )
      } finally {
        // sendMessage deletes all messages after `messageId`, so we have to revert original messages
        setMessages(chatTree.current.getAllNodes())
      }
    },
    [handleSendMessage, setMessages, isReadonly],
  )

  const handleSwitchMessageVersion = useCallback((messageId: string) => {
    // prevent auto-scroll to bottom when version is switched
    scrollRef.current?.stopScroll()
    const leafMessageId = chatTree.current.findLatestLeafDescendant(messageId)
    setChatPath(chatTree.current.buildPathFromLeafNode(leafMessageId))
  }, [])

  const handleGetMessageVersions = useCallback((messageId: string) => {
    return chatTree.current.getNodeVariants(messageId)
  }, [])

  const handleGetModelUsage = useCallback(
    (messageId: string) => {
      return modelUsageMap[messageId]
    },
    [modelUsageMap],
  )

  usePageTitle({
    title: activeChatData && !activeChatData.isTitlePending ? activeChatData.title : null,
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
      void handleSendMessage(...newChat.current.initialMessageArgs)
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
  }, [newChat, isStoredChat, chatData, addNewChatToCache])

  // Set message history for existing chats
  useEffect(() => {
    if (!history) return
    const historyMessages = history.pages.flatMap((d) => d.data)
    setMessages((prev) => {
      // If we already have messages (e.g. coming back with a warm Chat store),
      // don't prepend history again and cause duplicates.
      if (prev.length > 0) return prev
      return historyMessages
    })
  }, [history, setMessages])

  useEffect(() => {
    // Reset react query cache
    queryClient.setQueryData(useChatHistoryQuery.getKey({ id }), {
      pages: [{ data: [...messages], nextCursor: null }],
      pageParams: [null],
    })

    if (!messages.length) {
      setChatPath((prev) => (prev.length ? [] : prev))
      return
    }

    const tree = chatTree.current
    const inserted: string[] = []
    const updated: string[] = []
    for (const message of messages) {
      const existing = tree.getNodeById(message.id, false)
      if (!existing) {
        tree.addNode(message)
        inserted.push(message.id)
      } else if (existing !== message) {
        tree.updateNode(message)
        updated.push(message.id)
      }
    }

    if (inserted.length) {
      const rebuilt = tree.buildPathFromLeafNode(inserted.at(-1)!)
      setChatPath(rebuilt)
      return
    }

    if (updated.length) {
      setChatPath((prevPath) => {
        const updatedSet = new Set(updated)
        let nextPath = prevPath
        let remaining = updatedSet.size
        for (let i = prevPath.length - 1; i >= 0 && remaining > 0; i--) {
          const prevMsg = prevPath[i]
          if (!updatedSet.has(prevMsg.id)) continue
          updatedSet.delete(prevMsg.id)
          remaining--

          const latest = tree.getNodeById(prevMsg.id)
          if (latest === prevMsg) continue
          if (nextPath === prevPath) nextPath = prevPath.slice()
          nextPath[i] = latest
        }
        return nextPath
      })
    }
  }, [messages, queryClient, id])

  // Abort current chat request on unmount
  useEffect(() => {
    // Abort only on unmount; this has no effect if no active chat request
    return () => {
      if (statusRef.current === 'streaming') {
        void stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (dataError) {
    return (
      <ChatLayout>
        <ConversationEmptyState
          className='text-destructive'
          icon={<CircleAlert className='text-destructive' />}
          title='Unable to load chat data.'
          description={dataError.message}
        />
      </ChatLayout>
    )
  }

  return (
    <ChatLayout chat={activeChatData}>
      <div className='relative flex-1'>
        <div className='absolute inset-0'>
          <div className='h-full flex min-w-0 flex-col'>
            <Conversation contextRef={scrollRef} initial='instant'>
              {isDataLoading && (
                <ConversationEmptyState>
                  <LoadingDots className='text-4xl' />
                </ConversationEmptyState>
              )}
              <ConversationContent className='mx-auto max-w-4xl px-2 py-4 md:px-4 [&>*:last-child]:min-h-40'>
                <ChatMessages
                  isReadonly={isReadonly}
                  messages={chatPath}
                  getVersions={handleGetMessageVersions}
                  onSwitchVersion={handleSwitchMessageVersion}
                  getModelUsage={handleGetModelUsage}
                  sendMessage={handleSendMessage}
                  regenerate={handleRegenerate}
                  status={isLiveChatPath ? status : 'ready'}
                  error={isLiveChatPath ? error : undefined}
                />
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
        </div>
      </div>

      {(!chatData || chatData.userId === user.id) && (
        <div className='sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4'>
          <ChatPrompt
            chatId={id}
            isPending={isDataLoading}
            isEphemeral={!isStoredChat}
            sendMessage={handleSendMessage}
            parentMessageId={chatPath.at(-1)?.id}
            messagesCount={messages.length}
            status={status}
            stop={stop}
          />
        </div>
      )}
    </ChatLayout>
  )
}
