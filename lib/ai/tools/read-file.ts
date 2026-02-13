import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import type { ChatContext } from '../context'
import type { FileToolRecord } from './utils'

// Using a symbol to prevent it from being stored to db
const fileData = Symbol('fileData')

export type ReadFileOutput = {
  data?: Pick<FileToolRecord, 'id' | 'name' | 'mimeType' | 'size'> & {
    [fileData]?: string
  }
  error?: string
}

export function readFile({ api, chat }: ChatContext) {
  return {
    read_file: tool({
      description: 'Reads the raw data of a user file (don\'t call me if you don\'t support the file media_type).',
      inputSchema: z.object({
        file_id: z.uuid().describe('The user file ID.'),
      }),
      strict: true,
      toModelOutput: ({ output }) => {
        const { data, error } = output as ReadFileOutput
        if (data == null || error != null) {
          return {
            type: 'error-text',
            value: error ?? 'Unknown error',
          }
        }
        const { mimeType, [fileData]: downloadUrl } = data
        if (downloadUrl == null) {
          return {
            type: 'error-text',
            value: 'Recall this function to get full data',
          }
        }
        return {
          type: 'content',
          value: [
            {
              url: downloadUrl,
              type: mimeType.startsWith('image/') ? 'image-url' : 'file-url',
            },
          ],
        }
      },
      async execute({ file_id }): Promise<ReadFileOutput> {
        const file = await api.db.files.findByIdForUser(file_id, chat.userId)
        if (!file) {
          return { error: 'File not found' }
        }
        return {
          data: {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            [fileData]: file.url
          }
        }
      },
    })
  } satisfies ToolSet
}
