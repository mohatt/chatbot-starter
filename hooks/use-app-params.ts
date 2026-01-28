import { useParams } from 'next/navigation'

export function useAppParams() {
  const { cid, pid } = useParams<{ pid?: string; cid?: string }>()
  return {
    activeChatId: cid,
    activeProjectId: pid
  }
}
