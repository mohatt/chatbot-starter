'use client';

import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { fetcher } from '@/lib/util'
import type { ChatMessagesResult, ChatRecord } from '@/lib/db'
import ContextForm from './ContextForm';
import ContextSummary from './ContextSummary';
import ChatBox from './ChatBox';

interface ChatProps {
  id?: string | null;
}

function useChatApi(chatId: string | null) {
  return useSWR<ChatRecord>(() => chatId ? `/api/chat/${chatId}` : null, fetcher)
}

function useChatHistoryApi(chatId: string | null) {
  const getKey = (index: number, prevData: ChatMessagesResult) => {
    if (!chatId) return null;
    if (prevData && !prevData.nextCursor) return null; // no more results
    const cursor = prevData?.nextCursor;
    return `/api/chat/${chatId}/history${cursor && index !== 0 ? `?before=${cursor}` : ''}`;
  };

  const { data, size, setSize } = useSWRInfinite<ChatMessagesResult>(getKey, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    messages: data?.flatMap((d) => d.data).reverse() ?? [],
    loadMore: () => setSize(size + 1),
    hasMore: data?.[data.length - 1]?.nextCursor != null,
  };
}

export default function Chat(props: ChatProps) {
  const { id = null } = props;
  const { data, error, isLoading, mutate } = useChatApi(id);
  const { messages } = useChatHistoryApi(id);
  console.log(messages)
  return (
    <main>
      <section className="panel">
        <ContextForm chatId={data?.id} onComplete={mutate} loading={isLoading} error={error?.message} />
        <ContextSummary chat={data} />
      </section>

      <section className="panel chat-panel">
        <ChatBox chatId={data?.id} history={messages} isReady={!!data} />
      </section>
    </main>
  );
}
