import type { UUID } from 'node:crypto'

export interface FileUpload<Type extends string = string> {
  id: UUID
  name: string
  url?: string
  size: number
  type: Type
  mimeType: string
  blob: Blob
}

export interface FileUploadEntry<Type extends string = string> {
  index: number;
  file: FileUpload<Type>;
}

export interface FileUploadError {
  index?: number;
  message: string;
}

export interface FilesUploadResult<Type extends string = string> {
  data: FileUploadEntry<Type>[] | null
  errors: FileUploadError[]
}

export interface FileUploadResult<Type extends string = string> {
  data: FileUpload<Type> | null
  error: string | null
}

export interface FileUploadRules<Type extends string = string> {
  readonly min?: number;
  readonly max?: number;
  readonly maxSize?: number;
  readonly maxTotalSize?: number;
  readonly accept?: string[];
  readonly types?: Type[];
}
