import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { extension as mimeExtension, lookup as mimeLookup } from 'mime-types'
import { formatFileSize } from '@/lib/util'
import type { FileUpload, FileUploadRules, FileUploadResult, FilesUploadResult } from './types'

export function createFileUploadSchema<Type extends string = string>(rules: FileUploadRules<Type>) {
  const { min = 0, max = Infinity, maxSize = Infinity, maxTotalSize = Infinity, accept, types } = rules;

  const fileSchema = z.instanceof(File)
  const fileArraySchema = z
    .array(fileSchema)
    .min(min, `Choose at least ${min === 1 ? `one file` : `${min} files`} to upload.`)
    .max(max, `You can only upload up to ${max} files at a time.`)

  async function transform(file: File): Promise<FileUpload<Type>> {
    const { name, size, type } = file;
    if (!name) {
      throw new Error('Invalid file metadata.')
    }

    if (size == null || size <= 0) {
      throw new Error('File is empty.')
    }

    if (size > maxSize) {
      throw new Error(`File exceeds ${formatFileSize(maxSize)} limit.`)
    }

    const mimeType = type || mimeLookup(name)
    if (!mimeType) {
      throw new Error(`Unable to determine file type.`)
    }

    if(accept && !accept.includes(mimeType)) {
      throw new Error(`File type is not supported.`)
    }

    const defaultExt = mimeExtension(mimeType) as Type | false
    if(!defaultExt || (types && !types.includes(defaultExt))) {
      throw new Error(`File type is not supported.`)
    }

    return {
      id: randomUUID(),
      name,
      size,
      mimeType,
      type: defaultExt,
      blob: file
    }
  }

  async function parseArray(input: unknown): Promise<FilesUploadResult<Type>> {
    const zResult = fileArraySchema.safeParse(input);
    if(!zResult.success) {
      return {
        data: null,
        errors: zResult.error.issues.map(({ message }) => ({ message }))
      }
    }

    let totalSize = 0
    const promises = await Promise.allSettled(zResult.data.map(async (file) => {
      const upload = await transform(file)
      totalSize += upload.size
      return upload
    }))

    if (totalSize > maxTotalSize) {
      return {
        data: null,
        errors: [{ message: `Total files size exceeds ${formatFileSize(maxTotalSize)} limit.` }]
      }
    }

    const result: FilesUploadResult<Type> = { data: [], errors: [] }
    promises.forEach((promise, index) => {
      if (promise.status === 'fulfilled') {
        result.data!.push(promise.value);
      } else {
        result.errors.push({ index, message: promise.reason.message })
      }
    })
    return result
  }

  async function parse(input: unknown): Promise<FileUploadResult<Type>> {
    try {
      const file = fileSchema.parse(input);
      const upload = await transform(file)
      return { data: upload, error: null }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { data: null, error: err.issues[0].message }
      }
      return { data: null, error: (err as Error).message }
    }
  }

  return { parse, parseArray }
}
