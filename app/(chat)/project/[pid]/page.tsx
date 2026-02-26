'use client'
import { use, useMemo } from 'react'
import { generateUUID } from '@/lib/utils'
import { ProjectIndex } from '@/components/project'

export default function ProjectPage(props: PageProps<'/project/[pid]'>) {
  const { pid } = use(props.params)
  const cid = useMemo(
    () => generateUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pid],
  )
  return <ProjectIndex key={`${pid}/${cid}`} id={pid} newChatId={cid} />
}
