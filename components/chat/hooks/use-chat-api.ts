import useSWR, { SWRConfiguration } from 'swr'
import useSWRInfinite, { SWRInfiniteConfiguration } from 'swr/infinite'
import { useEventCallback } from 'usehooks-ts'
import { toast } from 'sonner'
import { fetcher } from '@/lib/util'
import type { ChatMessagesResult, ChatRecord } from '@/lib/db'

export function useChatApi(id: string, options?: SWRConfiguration<ChatRecord>) {
  const { data, error, isLoading, isValidating } = useSWR<ChatRecord>(`/api/chat/${id}`, fetcher, {
    ...options,
    onError: (err) => {
      toast.error(err.message)
    }
  })
  return { data, error, isLoading, isValidating }
}

export function useChatHistoryApi(id: string, options?: SWRInfiniteConfiguration<ChatMessagesResult>) {
  const getKey = (index: number, prevData: ChatMessagesResult) => {
    if (prevData && !prevData.nextCursor) return null; // no more results
    const cursor = prevData?.nextCursor;
    return `/api/chat/${id}/history${cursor && index !== 0 ? `?before=${cursor}` : ''}`;
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite<ChatMessagesResult>(getKey, fetcher, {
    ...options,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onError: (err) => {
      toast.error(err.message)
    }
  });

  const hasMore = data?.[data.length - 1]?.nextCursor != null
  const loadMore = useEventCallback(async () => {
    await setSize((prevSize) => prevSize + 1)
  })

  return {
    data,
    error,
    hasMore,
    loadMore,
    isLoading,
    isValidating,
    mutate,
    size,
  };
}
