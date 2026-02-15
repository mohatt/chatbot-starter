import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import { createFileToolModelOutput, type FileToolRecord } from './utils'
import type { ChatContext } from '../context'

export type ListFilesOutput = Array<FileToolRecord>

export function listFiles({ project, api }: ChatContext) {
  if (!project) {
    return null
  }

  return {
    list_files: tool({
      description: 'Can be used to list all user files in the current project.',
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
          value: fileList.map(createFileToolModelOutput),
        }
      },
      async execute(): Promise<ListFilesOutput> {
        const { data } = await api.db.files.findMany({ projectId: project.id })
        return data.map(({ id, name, mimeType, size, metadata, url, createdAt }) => {
          return { id, name, mimeType, size, url, metadata, createdAt }
        })
      },
    })
  } satisfies ToolSet
}
