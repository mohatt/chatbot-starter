import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import type { FileLoaderDoc } from '@/lib/document'
import type { ChatContext } from '../context'

// Using a symbol to prevent it from being stored to db
const fullText = Symbol('fullText')

export type FileTextSearchOutput = {
  data?: Array<{ file: FileLoaderDoc['metadata']['file'] } & {
    pageNumber?: number
    score: number
    excerpt: string
    [fullText]?: string
  }>
  error?: string
}

export function fileTextSearch({ api, project }: ChatContext) {
  if (!project) {
    return null
  }

  return {
    file_text_search: tool({
      description: 'Queries file text chunks and returns results sorted based on the distance metric score (It can\'t access images; Inspect the results carefully to find information relevant to user query).',
      inputSchema: z.object({
        query: z.string().describe('The query to use for vector similarity search.'),
        topK: z
          .number()
          .int()
          .positive()
          .describe('The number of file search retrieval chunks to retrieve (Provide a number between 1 and 25; Higher values (like 20) provide more context; Lower values (like 3) focus on best matches; Default: 10 results (use this if unsure)).'),
        fileIds: z
          .array(z.uuid())
          .nullish()
          .describe('Optional file IDs to filter the file search retrieval documents (optional; Accepts an array of file IDs; The order of file IDs won\'t change the returned results).'),
      }),
      strict: true,
      toModelOutput({ output }) {
        const { data, error } = output as FileTextSearchOutput
        if (data == null || error != null) {
          return {
            type: 'text',
            value: error ?? 'Unknown error'
          }
        }
        return {
          type: 'json',
          value: data.map(({ file: { id, name, ...file }, excerpt, [fullText]: text, ...result }) => ({
            ...file,
            ...result,
            fileId: id,
            filename: name,
            text: text ?? excerpt,
          })),
        }
      },
      async execute({ query, topK, fileIds }): Promise<FileTextSearchOutput> {
        let filter = `projectId = '${project.id}'`
        if (fileIds?.length) {
          filter += `AND file.id IN ('${fileIds.join(`', '`)}')`
        }
        const docs = await api.vectorDb.files.query(query, Math.min(25, topK), filter);
        if (!docs.length) {
          const idsCount = fileIds?.length ?? 0
          return {
            error: idsCount > 0
              ? `Received invalid file ID${idsCount === 1 ? '' : 's'}`
              : 'No project files found'
          }
        }
        return {
          data: docs
            .filter(([, score]) => score >= 0.7)
            .map(([{ data, metadata }, score]) => ({
              score,
              excerpt: `${data.slice(0, 64).trim()}…`,
              [fullText]: data,
              file: metadata.file,
              pageNumber: 'pageNumber' in metadata ? metadata.pageNumber : undefined,
            }))
        }
      },
    }),
  } satisfies ToolSet
}
