import { createMutation } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import { useFilesQuery } from '../queries/files'
import type { FileRecord } from '@/lib/db'
import type { PostRequestBody } from '@/app/(core)/api/files/schema'

export const useUploadFileMutation = createMutation({
  mutationKey: ['uploadFile'],
  mutationFn: async (vars: PostRequestBody) => {
    const formData = new FormData();
    formData.append('file', vars.file);
    formData.append('bucket', vars.bucket);
    formData.append('metadata', JSON.stringify(vars.metadata));
    return fetcher<FileRecord>(`/api/files`, {
      method: 'POST',
      body: formData
    })
  },
  onSuccess: (file, { metadata }, _, { client }) => {
    if (metadata.namespace === 'project') {
      client.setQueryData(useFilesQuery.getKey({ projectId: metadata.projectId }), (prevData) => {
        if(!prevData?.length) return [file];
        // Dedupe based on file id
        const nextFiles = prevData.filter((f) => f.id !== file.id)
        // Prepend new file to files array
        return [file, ...nextFiles]
      })
    }
  },
})

export const useDeleteFileMutation = createMutation({
  mutationKey: ['deleteFile'],
  mutationFn: async (vars: { id: string }) => {
    return fetcher<FileRecord>(`/api/files?id=${vars.id}`, { method: 'DELETE' })
  },
  onSuccess: ({ id, projectId }, _, _1, { client }) => {
    if (projectId) {
      client.setQueryData(useFilesQuery.getKey({ projectId }), (prevData) => {
        if(!prevData) return prevData;
        // Remove based on file id
        return prevData.filter((f) => f.id !== id)
      })
    }
  },
})
