import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import type { FileLoaderDoc } from '@/lib/document'
import type { ChatToolContext } from '@/lib/ai'

// Using a symbol to prevent it from being stored to db
const textChunks = Symbol('textChunks')

export type ReadFileTextOutput = FileLoaderDoc['metadata']['file'] & {
  chunkCount: number
  [textChunks]: {
    text: string
    index: number
    pageNumber?: number
  }[]
} | null

export function readFileText({ api, project }: ChatToolContext) {
  if (!project) {
    return null
  }

  return {
    read_file_text: tool({
      description: 'Reads all text chunks for a user file (doesn\'t work on images).',
      inputSchema: z.object({
        fileId: z.uuid().describe('The file ID to read.'),
      }),
      strict: true,
      toModelOutput({ output }) {
        const result = output as ReadFileTextOutput
        if (!result) {
          return {
            type: 'error-text',
            value: 'File not found',
          }
        }
        const { id, name, [textChunks]: text, ...file } = result
        return {
          type: 'json',
          value: {
            ...file,
            fileId: id,
            filename: name,
            text: text ?? '[Redacted]'
          },
        }
      },
      async execute({ fileId }): Promise<ReadFileTextOutput> {
        const filter = `file.id = '${fileId}'`
        const results = await api.vectorDb.files.query('any', 50, filter);
        let result: ReadFileTextOutput = null
        if (results.length > 0) {
          const sortedResults = results
            .slice()
            .sort(([{ metadata: a }], [{ metadata: b }]) => a.index - b.index)
          for (const [{ data, metadata }] of sortedResults) {
            if (!result) {
              result = {
                ...metadata.file,
                chunkCount: results.length,
                [textChunks]: [],
              }
            }
            result[textChunks].push({
              index: metadata.index,
              pageNumber: 'pageNumber' in metadata ? metadata.pageNumber : undefined,
              text: data,
            })
          }
        }
        return result
      },
    }),
  } satisfies ToolSet
}
