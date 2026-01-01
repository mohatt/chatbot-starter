import { createQuery, createInfiniteQuery } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import type { ChatRecord, ChatUIMessageRecord, PaginatedResult } from '@/lib/db'

export const useChatQuery = createQuery({
  queryKey: ['chat'],
  fetcher: async (vars: { id: string }) => fetcher<ChatRecord>(`/api/chat/${vars.id}`),
})

export const useChatHistoryQuery = createInfiniteQuery({
  queryKey: ['chatHistory'],
  initialPageParam: null as string | null,
  fetcher: async (vars: { id: string }, { pageParam }) => {
    const query = new URLSearchParams();
    if (pageParam) query.set('before', pageParam);
    const url = `/api/chat/${vars.id}/history${query.size > 0 ? `?${query.toString()}` : ''}`;
    return fetcher<PaginatedResult<ChatUIMessageRecord>>(url)
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  staleTime: 'static',
})

export const useChatsQuery = createInfiniteQuery({
  queryKey: ['chats'],
  initialPageParam: null as string | null,
  fetcher: async (vars: { projectId: string | null }, { pageParam, client }) => {
    const query = new URLSearchParams({ limit: String(25) });
    if (vars.projectId != null) query.set('projectId', vars.projectId);
    if (pageParam) query.set('cursor', pageParam);
    const url = `/api/chat/history${query.size > 0 ? `?${query.toString()}` : ''}`;
    const result = await fetcher<PaginatedResult<ChatRecord>>(url)
    for (const chat of result.data) {
      client.setQueryData(useChatQuery.getKey({ id: chat.id }), chat)
    }
    return result
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
