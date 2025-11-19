'use client';

import { useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/util'
import type { ChatRecord } from '@/lib/db';
import ContextForm from './ContextForm';
import ContextSummary from './ContextSummary';
import ChatBox from './ChatBox';

interface ChatProps {
  id?: string | null;
}

export default function Chat(props: ChatProps) {
  const { id } = props;
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const { error, isLoading } = useSWR<ChatRecord>(id ? `/api/chat/${id}` : null, fetcher, {
    onSuccess: (data) => {
      setChat(data)
    }
  })

  return (
    <main>
      <section className="panel">
        <ContextForm chatId={chat?.id} onComplete={setChat} loading={isLoading} error={error?.message} />
        <ContextSummary chat={chat} />
      </section>

      <section className="panel chat-panel">
        <ChatBox chatId={chat?.id} isReady={!!chat} />
      </section>
    </main>
  );
}
