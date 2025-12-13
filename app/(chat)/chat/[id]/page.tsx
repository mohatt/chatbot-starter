'use client';
import { use } from 'react'
import { Chat } from '@/components/chat'

export default function ChatPage(props: PageProps<'/chat/[id]'>) {
  const { id } = use(props.params);
  return <Chat key={id} id={id} />;
}
