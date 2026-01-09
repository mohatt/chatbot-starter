'use client';
import { use } from 'react'
import { generateUUID } from '@/lib/util'
import { ProjectIndex } from '@/components/project'
import { NewChat } from '@/components/chat/new-chat'

export default function ChatPage(props: PageProps<'/project/[pid]'>) {
  const { pid } = use(props.params);
  const cid = generateUUID();
  return (
    <NewChat key={`${pid}/${cid}`} id={cid} projectId={pid}>
      {({ sendMessage }) => (
        <ProjectIndex id={pid} sendMessage={sendMessage} />
      )}
    </NewChat>
  );
}
