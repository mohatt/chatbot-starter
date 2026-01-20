import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import { formatFileSize } from '@/lib/util'
import type { FileRecord } from '@/lib/db'
import type { ChatToolContext } from '@/lib/ai'

export type ListFilesOutput = Array<Pick<FileRecord, 'id' | 'name' | 'mimeType' | 'url' | 'size' | 'metadata'> & {
  createdAt: string
}>

export function listFiles({ project, api }: ChatToolContext) {
  if (!project) {
    return null
  }

  return {
    list_files: tool({
      description: 'Lists user-uploaded files in the current project and their metadata.',
      inputSchema: z.object({}),
      strict: true,
      toModelOutput: ({ output }) => {
        const fileList = output as ListFilesOutput
        if (!fileList.length) {
          return {
            type: 'text',
            value: 'No files found',
          }
        }
        return {
          type: 'json',
          value: fileList.map(({ id, name, mimeType, size, metadata, url, createdAt }) => {
            return {
              fileId: id,
              fileName: name,
              mediaType: mimeType,
              size: formatFileSize(size),
              downloadUrl: url,
              uploadedAt: createdAt,
              ...(metadata?.retrieval && {
                totalTextChunks: metadata.retrieval.vectors,
                totalTokens: metadata.retrieval.tokens,
              }),
            }
          })
        }
      },
      async execute(): Promise<ListFilesOutput> {
        const { data } = await api.db.files.findMany({ projectId: project.id })
        return data.map(({ id, name, mimeType, size, metadata, url, createdAt }) => {
          return { id, name, mimeType, size, url, metadata, createdAt: createdAt.toISOString() }
        })
      },
    })
  } satisfies ToolSet
}
