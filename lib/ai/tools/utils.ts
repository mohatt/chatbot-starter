import { formatFileSize } from '@/lib/utils'
import type { FileLoaderDoc } from '@/lib/document'
import type { FileRecord } from '@/lib/db'

// File record coming from db
export type FileToolRecord = Pick<FileRecord, 'id' | 'name' | 'mimeType' | 'url' | 'size' | 'metadata' | 'createdAt'>

// File metadata coming from vector db
export type FileToolLoaderRecord = FileLoaderDoc['metadata']['file'] & { chunkCount?: number }

// File metadata interface that's sent to the language model as JSON
export type FileToolModelOutput = {
  file_id: string
  file_name: string
  media_type: string
  read_file_command?: string
  read_file_text_command?: string
  size?: string
  url?: string
  upload_date?: string

  // Retrieval metadata
  total_text_chunks?: number
  total_tokens?: number

  // PDF file metadata
  pdf_title?: string
  pdf_author?: string
  pdf_language?: string
  tota_pages?: number
}

export function createFileToolModelOutput(file: FileToolRecord | FileToolLoaderRecord): FileToolModelOutput {
  const isImage = file.mimeType.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'
  let record: FileToolModelOutput = {
    file_id: file.id,
    file_name: file.name,
    media_type: file.mimeType,
    read_file_command: isImage || isPdf
      ? `function_call:read_file(file_id: ${file.id})`
      : undefined,
    read_file_text_command: isImage
      ? undefined
      : `function_call:read_file_text(file_id: ${file.id})`,
  }

  if ('url' in file) {
    return {
      ...record,
      size: formatFileSize(file.size),
      url: file.url,
      upload_date: file.createdAt,
      ...(file.metadata?.retrieval && {
        total_text_chunks: file.metadata.retrieval.vectors,
        total_tokens: file.metadata.retrieval.tokens,
      }),
    }
  }

  return {
    ...record,
    total_text_chunks: file.chunkCount,
    ...('totalPages' in file && {
      pdf_title: file.title,
      pdf_author: file.author,
      pdf_language: file.language,
      tota_pages: file.totalPages,
    }),
  }
}
