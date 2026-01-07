import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { formatFileSize } from '@/lib/util'
import type { FileRecord } from '@/lib/db'
import type { FileLoaderDoc } from '@/lib/document'
import type { ChatToolContext } from './types'

export type ListFilesOutput = {
  files: Pick<FileRecord, 'id' | 'url' | 'name' | 'mimeType' | 'size'>[]
  getOutput: () => FileRecord[]
}

export function listFiles({ project, api }: ChatToolContext) {
  if (!project) {
    return null
  }
  return {
    listFiles: tool({
      description: 'Lists user-uploaded files and metadata in the current project.',
      inputSchema: z.object({}),
      strict: true,
      toModelOutput({ output }) {
        const fileList = (output as ListFilesOutput).getOutput()
        return {
          type: 'content',
          value: [
            {
              type: 'text',
              text: [
                ...fileList.map(({ id, url, name, mimeType, size }, i) => {
                  return `${i + 1}. ${name} (id: ${id}, type: ${mimeType}, size: ${formatFileSize(size)}, url: ${url})`
                }),
                '\nYou can refer to file IDs when calling queryFileContents to narrow down query results.'
              ].join('\n')
            }
          ]
        }
      },
      async execute(): Promise<ListFilesOutput> {
        // console.log('listFiles-tool-call')
        const { data } = await api.db.files.findMany({ projectId: project.id })
        return {
          files: data.map(({ id, url, name, mimeType, size }) => ({ id, url, name, mimeType, size })),
          getOutput: () => data
        }
      },
    })
  } satisfies ToolSet
}

export type QueryFileContentsOutput = {
  count: number
  getOutput: () => {
    data: string
    score: number
    metadata: Omit<FileLoaderDoc['metadata'], 'projectId'>
  }[]
}

export function queryFileContents({ api, project, dataStream }: ChatToolContext) {
  if (!project) {
    return null
  }
  return {
    queryFileContents: tool({
      description: 'Queries file text chunks and returns results sorted based on the distance metric score.',
      inputSchema: z.object({
        query: z.string().describe('The query to use for vector similarity search (Optional).').nullish(),
        topK: z.number().int().describe('The total number of the results that you want to receive (Default: 5; Max: 25).').default(5),
        fileIds: z.array(z.uuid()).describe('The file ids to use for content search (Optional; Accepts an array of UUID strings).').nullish(),
      }),
      strict: true,
      toModelOutput({ output }) {
        return {
          type: 'json',
          value: (output as QueryFileContentsOutput).getOutput(),
        }
      },
      async execute({ query, topK, fileIds }): Promise<QueryFileContentsOutput> {
        let filter = `projectId = '${project.id}'`
        if (fileIds?.length) {
          filter += `AND file.id IN ('${fileIds.join(`', '`)}')`
        }
        const relevantChunks = await api.vectorDb.files.query(query || 'any', Math.min(10, topK), filter);
        // console.log('queryFileContents-tool-call', { query, fileIds }, filter)
        return {
          count: relevantChunks.length,
          getOutput: () => relevantChunks.map(([{ data, metadata }, score]) => {
            const { projectId, ...meta } = metadata
            return {
              data,
              metadata: meta,
              score,
            }
          })
        }
      },
    }),
  } satisfies ToolSet
}

export const defaultVectorQueryDescription = () =>
  `Access the knowledge base to find information needed to answer user questions.`;

export const defaultGraphRagDescription = () =>
  `Access and analyze relationships between information in the knowledge base to answer complex questions about connections and patterns.`;

export const queryTextDescription = `The text query to search for in the vector database.
- ALWAYS provide a non-empty query string
- Must contain the user's question or search terms
- Example: "market data" or "financial reports"
- If the user's query is about a specific topic, use that topic as the queryText
- Cannot be an empty string
- Do not include quotes, just the text itself
- Required for all searches`;

export const topKDescription = `Controls how many matching documents to return.
- ALWAYS provide a value
- If no value is provided, use the default (10)
- Must be a valid and positive number
- Cannot be NaN
- Uses provided value if specified
- Default: 10 results (use this if unsure)
- Higher values (like 20) provide more context
- Lower values (like 3) focus on best matches
- Based on query requirements`;
