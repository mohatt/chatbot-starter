'use client'
import { NewChat } from '@/components/chat/new-chat'
import { generateUUID } from '@/lib/utils'

export default function HomePage(_: PageProps<'/'>) {
  const cid = generateUUID()
  return <NewChat key={cid} id={cid} projectId={null} />
}
