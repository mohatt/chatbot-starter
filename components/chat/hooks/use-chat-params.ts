import { useParams } from 'next/navigation'

export function useChatParams() {
  const { cid, pid } = useParams<{ pid?: string; cid?: string }>()
  return {
    activeChatId: cid,
    activeProjectId: pid
  }
}
