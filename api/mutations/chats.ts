import { createMutation } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import type { ChatRecord } from '@/lib/db'
import type { PatchRequestBody } from '@/app/(chat)/api/chat/[id]/schema'
import { useChatQuery, useChatsQuery } from '../queries/chats'

export const useUpdateChatMutation = createMutation({
  mutationKey: ['updateChat'],
  mutationFn: async (vars: { id: string } & PatchRequestBody) => {
    const { id, ...body } = vars
    return fetcher<ChatRecord>(`/api/chat/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  },
  onSuccess: (chat, { id }, _, { client }) => {
    client.setQueryData(useChatQuery.getKey({ id }), chat)
    client.setQueryData(useChatsQuery.getKey({ projectId: chat.projectId }), (prevData) => {
      if(!prevData) return prevData;
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.map((c) => c.id === id ? chat : c),
        }))
      }
    })
  },
})

// This mutation is only used to save new chats to local cache
export const useNewChatMutation = createMutation({
  mutationKey: ['newChat'],
  mutationFn: async (vars: ChatRecord) => vars,
  onSuccess: (data, _, _1, { client }) => {
    client.setQueryData(useChatsQuery.getKey({ projectId: data.projectId }), (prevData) => {
      if(!prevData) return prevData;

      const { pages, pageParams } = prevData;
      if (!pages.length) {
        return {
          pages: [{ data: [data], nextCursor: null }],
          pageParams: [null],
        }
      }

      // Dedupe based on chat id
      const nextPages = pages.map((page) => ({
        ...page,
        data: page.data.filter((c) => c.id !== data.id),
      }))
      // Prepend new chat to first page
      nextPages[0] = {
        ...nextPages[0],
        data: [data, ...nextPages[0].data],
      }
      return { pages: nextPages, pageParams }
    })
  },
})

export const useDeleteChatMutation = createMutation({
  mutationKey: ['deleteChat'],
  mutationFn: async (vars: { id: string }) => {
    return fetcher<ChatRecord>(`/api/chat/${vars.id}`, { method: 'DELETE' })
  },
  onSuccess: ({ projectId }, { id }, _, { client }) => {
    client.setQueryData(useChatsQuery.getKey({ projectId }), (prevData) => {
      if(!prevData) return prevData;
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.filter((c) => c.id !== id),
        }))
      }
    })
  }
})

export const useDeleteChatsMutation = createMutation({
  mutationKey: ['deleteChats'],
  mutationFn: async (vars: { projectId: string | null }) => {
    return fetcher<string[]>(`/api/chat/history${vars.projectId ? `?projectId=${vars.projectId}` : ''}`, {
      method: 'DELETE',
    })
  },
  onSuccess: (_, { projectId }, _1, { client }) => {
    client.setQueryData(useChatsQuery.getKey({ projectId }), (prevData) => {
      if(!prevData) return prevData;
      return {
        pages: [{ data: [], nextCursor: null }],
        pageParams: [null],
      }
    })
  },
})
