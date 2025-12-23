import { createMutation } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import { useProjectsQuery, useProjectQuery } from '@/api/queries/projects'
import { useChatsQuery } from '@/api/queries/chats'
import type { ChatProjectRecord } from '@/lib/db'
import type { UpsertProjectRequest, UpsertProjectResponse } from '@/app/(chat)/api/project/[id]/schema'

export const useUpsertProjectMutation = createMutation({
  mutationKey: ['upsertProject'],
  mutationFn: async (vars: { id: string } & UpsertProjectRequest) => {
    const { id, files, ...body } = vars
    const formData = new FormData();
    formData.append('body', JSON.stringify(body));
    files.forEach((file) => formData.append('files', file));
    return fetcher<UpsertProjectResponse>(`/api/project/${id}`, {
      method: 'POST',
      body: formData
    })
  },
  onSuccess: (result, { id, create }, _, { client }) => {
    const project = result.data
    if (!project) {
      return
    }
    client.setQueryData(useProjectQuery.getKey({ id }), project)
    if (create) {
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
      return
    }

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
