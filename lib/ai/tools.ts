import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { formatFileSize } from '@/lib/util'
import type { FileRecord } from '@/lib/db'
import type { FileLoaderDoc } from '@/lib/document'
import type { ChatToolContext } from './types'

export type ListFilesOutput = Array<Pick<FileRecord, 'id' | 'name' | 'mimeType' | 'url' | 'size' | 'metadata'> & {
  createdAt: string
}>

export function listFiles({ project, api }: ChatToolContext) {
  if (!project) {
    return null
  }
  return {
    listFiles: tool({
      description: 'Lists user-uploaded files in the current project and their metadata.',
      inputSchema: z.object({}),
      strict: true,
      title: 'Reading project files',
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
    readFile: tool({
      description: 'Reads a user file\s raw data (don\'t call me if you won\'t be able to understand the file mediaType).',
      inputSchema: z.object({
        fileId: z.uuid().describe('The file id to read.'),
      }),
      strict: true,
      title: 'Reading file',
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
    readFileText: tool({
      description: 'Reads all text chunks for a user file (doesn\'t work on images).',
      inputSchema: z.object({
        fileId: z.uuid().describe('The file id to read.'),
      }),
      title: 'Reading document',
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

export function fileTextSearch({ api, project }: ChatToolContext) {
  if (!project) {
    return null
  }
  return {
    fileTextSearch: tool({
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
      title: 'Searching documents',
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
