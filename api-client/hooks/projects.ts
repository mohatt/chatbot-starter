import { createInfiniteQuery, createQuery, createMutation } from 'react-query-kit'
import { fetcher } from '@/lib/utils'
import { useChatsQuery } from './chats'
import type { ChatProjectRecord, PaginatedResult } from '@/lib/db'
import type { PostRequestBody, PatchRequestBody } from '@/app/(chat)/api/project/[id]/schema'

export const useProjectQuery = createQuery({
  queryKey: ['project'],
  fetcher: async (vars: { id: string }) => fetcher<ChatProjectRecord>(`/api/project/${vars.id}`),
})

export const useProjectsQuery = createInfiniteQuery({
  queryKey: ['projects'],
  initialPageParam: null as string | null,
  fetcher: async (_vars: never, { pageParam, client }) => {
    const query = new URLSearchParams({ limit: String(5) })
    if (pageParam) query.set('cursor', pageParam)
    const url = `/api/project/history${query.size > 0 ? `?${query.toString()}` : ''}`
    const result = await fetcher<PaginatedResult<ChatProjectRecord>>(url)
    for (const project of result.data) {
      client.setQueryData(useProjectQuery.getKey({ id: project.id }), project)
    }
    return result
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})

export const useCreateProjectMutation = createMutation({
  mutationKey: ['createProject'],
  mutationFn: async (vars: { id: string } & PostRequestBody) => {
    const { id, ...body } = vars
    return fetcher<ChatProjectRecord>(`/api/project/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  onSuccess: (project, { id }, _, { client }) => {
    client.setQueryData(useProjectQuery.getKey({ id }), project)
    client.setQueryData(useChatsQuery.getKey({ projectId: id }), {
      pages: [{ data: [], nextCursor: null }],
      pageParams: [null],
    })
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if (!prevData) return prevData

      const { pages, pageParams } = prevData
      if (!pages.length) {
        return {
          pages: [{ data: [project], nextCursor: null }],
          pageParams: [null],
        }
      }

      // Dedupe based on project id
      const nextPages = pages.map((page) => ({
        ...page,
        data: page.data.filter((p) => p.id !== project.id),
      }))
      // Prepend new project to first page
      nextPages[0] = {
        ...nextPages[0],
        data: [project, ...nextPages[0].data],
      }
      return { pages: nextPages, pageParams }
    })
  },
})

export const useUpdateProjectMutation = createMutation({
  mutationKey: ['updateProject'],
  mutationFn: async (vars: { id: string } & PatchRequestBody) => {
    const { id, ...body } = vars
    return fetcher<ChatProjectRecord>(`/api/project/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  onSuccess: (project, { id }, _, { client }) => {
    client.setQueryData(useProjectQuery.getKey({ id }), project)
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if (!prevData) return prevData
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.map((p) => (p.id === id ? project : p)),
        })),
      }
    })
  },
})

export const useDeleteProjectMutation = createMutation({
  mutationKey: ['deleteProject'],
  mutationFn: async (vars: { id: string }) => {
    return fetcher<ChatProjectRecord>(`/api/project/${vars.id}`, { method: 'DELETE' })
  },
  onSuccess: (_, { id }, _1, { client }) => {
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if (!prevData) return prevData
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.filter((p) => p.id !== id),
        })),
      }
    })
  },
})

export const useDeleteProjectsMutation = createMutation({
  mutationKey: ['deleteProjects'],
  mutationFn: async () => {
    return fetcher<string[]>('/api/project/history', { method: 'DELETE' })
  },
  onSuccess: (_, _1, _2, { client }) => {
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if (!prevData) return prevData
      return {
        pages: [{ data: [], nextCursor: null }],
        pageParams: [null],
      }
    })
  },
})
