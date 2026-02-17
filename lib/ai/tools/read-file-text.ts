import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import { createFileToolModelOutput, type FileToolLoaderRecord } from './utils'
import type { ChatContext } from '../context'

// Using a symbol to prevent it from being stored to db
const textChunks = Symbol('textChunks')

export type ReadFileTextOutput =
  | (FileToolLoaderRecord & {
      chunkCount: number
      [textChunks]: {
        text: string
        index: number
        page_number?: number
      }[]
    })
  | null

export function readFileText({ api, chat }: ChatContext) {
  return {
    read_file_text: tool({
      description: "Can be used to read all text chunks for a user file (doesn't work on images).",
      inputSchema: z.object({
        file_id: z.uuid().describe('The user file ID.'),
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
        const { [textChunks]: text, ...file } = result
        return {
          type: 'json',
          value: {
            ...createFileToolModelOutput(file),
            text: text ?? '[recall this function to get full text]',
          },
        }
      },
      async execute({ file_id }): Promise<ReadFileTextOutput> {
        const file = await api.db.files.findByIdForUser(file_id, chat.userId)
        if (!file) {
          return null
        }
        const filter = `file.id = '${file.id}'`
        const results = await api.vectorDb.files.query('any', 50, filter)
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
              page_number: 'pageNumber' in metadata ? metadata.pageNumber : undefined,
              text: data,
            })
          }
        }
        return result
      },
    }),
  } satisfies ToolSet
}
