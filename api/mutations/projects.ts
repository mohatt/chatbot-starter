import { createMutation } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import { useProjectsQuery, useProjectQuery } from '@/api/queries/projects'
import { useChatsQuery } from '@/api/queries/chats'
import type { ChatProjectRecord } from '@/lib/db'
import type { PostRequestBody, PatchRequestBody } from '@/app/(chat)/api/project/[id]/schema'

export const useCreateProjectMutation = createMutation({
  mutationKey: ['createProject'],
  mutationFn: async (vars: { id: string } & PostRequestBody) => {
    const { id, ...body } = vars
    return fetcher<ChatProjectRecord>(`/api/project/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  },
  onSuccess: (project, { id }, _, { client }) => {
    client.setQueryData(useProjectQuery.getKey({ id }), project)
    client.setQueryData(useChatsQuery.getKey({ projectId: id }), {
      pages: [{ data: [], nextCursor: null }],
      pageParams: [null],
    })
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if(!prevData) return prevData;

      const { pages, pageParams } = prevData;
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
      body: JSON.stringify(body)
    })
  },
  onSuccess: (project, { id }, _, { client }) => {
    client.setQueryData(useProjectQuery.getKey({ id }), project)
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if(!prevData) return prevData;
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.map((p) => p.id === id ? project : p),
        }))
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
      console.log({ prevData })
      if(!prevData) return prevData;
      return {
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          data: page.data.filter((p) => p.id !== id),
        }))
      }
    })
  }
})

export const useDeleteProjectsMutation = createMutation({
  mutationKey: ['deleteProjects'],
  mutationFn: async () => {
    return fetcher<string[]>('/api/project/history', { method: 'DELETE' })
  },
  onSuccess: (_, _1, _2, { client }) => {
    client.setQueryData(useProjectsQuery.getKey(), (prevData) => {
      if(!prevData) return prevData;
      return {
        pages: [{ data: [], nextCursor: null }],
        pageParams: [null],
      }
    })
  }
})
