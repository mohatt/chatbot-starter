'use client'
import { use } from 'react'
import { Chat } from '@/components/chat'

export default function ProjectChatPage(props: PageProps<'/project/[pid]/[cid]'>) {
  const { pid, cid } = use(props.params)
  return <Chat key={`${pid}/${cid}`} id={cid} projectId={pid} />
}
