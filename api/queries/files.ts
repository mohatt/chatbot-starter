import { createQuery } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import type { FileRecord } from '@/lib/db'

export const useFilesQuery = createQuery({
  queryKey: ['files'],
  fetcher: async (vars: { projectId: string }) => fetcher<FileRecord[]>(`/api/files?projectId=${vars.projectId}`),
})
