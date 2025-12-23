import { createInfiniteQuery, createQuery } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import type { ChatProjectRecord, ProjectsResult } from '@/lib/db'

export const useProjectQuery = createQuery({
  queryKey: ['project'],
  fetcher: async (vars: { id: string }) => fetcher<ChatProjectRecord>(`/api/project/${vars.id}`),
})

export const useProjectsQuery = createInfiniteQuery({
  queryKey: ['projects'],
  initialPageParam: null as string | null,
  fetcher: async (_vars: never, { pageParam, client }) => {
    const query = new URLSearchParams({ limit: String(5) });
    if (pageParam) query.set('cursor', pageParam);
    const url = `/api/project/history${query.size > 0 ? `?${query.toString()}` : ''}`;
    const result = await fetcher<ProjectsResult>(url)
    for (const project of result.data) {
      client.setQueryData(useProjectQuery.getKey({ id: project.id }), project)
    }
    return result
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
