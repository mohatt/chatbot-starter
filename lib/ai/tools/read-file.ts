import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import type { FileRecord } from '@/lib/db'
import type { ChatToolContext } from '@/lib/ai'

// Using a symbol to prevent it from being stored to db
const fileData = Symbol('fileData')

export type ReadFileOutput = {
  data?: Pick<FileRecord, 'id' | 'name' | 'mimeType' | 'size'> & {
    [fileData]?: string
  }
  error?: string
}

export function readFile({ api }: ChatToolContext) {
  return {
    read_file: tool({
      description: 'Reads a user file\'s raw data (don\'t call me if you won\'t be able to understand the file mediaType).',
      inputSchema: z.object({
        fileId: z.uuid().describe('The file ID to read.'),
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
        const { name, mimeType, [fileData]: downloadData } = data
        if (downloadData == null) {
          return {
            type: 'error-text',
            value: 'Download skipped',
          }
        }
        return {
          type: 'content',
          value: [
            {
              data: downloadData,
              type: mimeType.startsWith('image/') ? 'image-data' : 'file-data',
              mediaType: mimeType,
              filename: name,
            }
          ]
        }
      },
      async execute({ fileId }): Promise<ReadFileOutput> {
        const file = await api.db.files.findById(fileId)
        if (!file) {
          return { error: 'File not found' }
        }
        try {
          const res = await fetch(file.url)
          if (!res.ok || !res.body || [204, 205].includes(res.status)) {
            throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
          }
          const arrayBuffer = await res.arrayBuffer()
          return {
            data: {
              id: file.id,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType,
              [fileData]: Buffer.from(arrayBuffer).toString('base64')
            }
          }
        } catch(_err) {
          return { error: 'Failed downloading file' }
        }
      },
    })
  } satisfies ToolSet
}
