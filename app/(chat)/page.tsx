'use client';
import { NewChat } from '@/components/chat'
import { generateUUID } from '@/lib/util'

export default function HomePage(_: PageProps<'/'>) {
  const id = generateUUID();
  return <NewChat key={id} id={id} />
}
