'use client'
import { use } from 'react'
import { Chat } from '@/components/chat'

export default function ChatPage(props: PageProps<'/chat/[cid]'>) {
  const { cid } = use(props.params)
  return <Chat key={cid} id={cid} projectId={null} />
}
