import { z } from 'zod'
import { randomUUID, type UUID } from 'node:crypto'
import { extension as mimeExtension, lookup as mimeLookup } from 'mime-types'
import { formatFileSize } from '@/lib/util'

export interface FileUpload<Type extends string = string> {
  id: UUID
  name: string
  url?: string
  size: number
  type: Type
  mimeType: string
  blob: Blob
}

export interface FileUploadRules<Type extends string = string> {
  /**
   * Allowed file types.
   * Examples: ['png', 'jpg', 'jpeg'], ['pdf', 'doc']
   */
  readonly types?: Type[]

  /**
   * Allowed MIME types. Supports wildcards like `image/*`.
   * Examples: ['image/*'], ['image/png', 'image/jpeg']
   */
  readonly accept?: string[]

  /** Default max size in bytes (applies when no per-type / accept override exists) */
  readonly maxSize?: number

  /** Optional per-type max size in bytes (e.g. { png: 2_000_000, pdf: 10_000_000 }) */
  readonly maxSizeByType?: Partial<Record<Type, number>>

  /**
   * Optional max size overrides by MIME rule.
   * Keys can be exact MIME types (e.g. 'image/png') or wildcards (e.g. 'image/*').
   */
  readonly maxSizeByAccept?: Partial<Record<string, number>>
}

export function fileUpload<Type extends string = string>(rules: FileUploadRules<Type> = {}) {
  const { maxSize = Infinity, maxSizeByType, maxSizeByAccept, accept, types } = rules

  function matchesAccept(mimeType: string, rule: string){
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1)
      return mimeType.startsWith(prefix)
    }
    return mimeType === rule
  }

  function resolveMaxSize(mimeType: string, ext: Type) {
    const exact = maxSizeByAccept?.[mimeType]
    if (exact != null) return exact

    const byType = maxSizeByType?.[ext]
    if (byType != null) return byType

    const wildcardKey = Object
      .keys(maxSizeByAccept ?? {})
      .find((rule) => matchesAccept(mimeType, rule))
    const wildcard = wildcardKey ? maxSizeByAccept?.[wildcardKey] : undefined
    return wildcard ?? maxSize
  }

  function transform(file: File): FileUpload<Type> {
    const { name, size, type } = file
    if (!name) {
      throw new Error('Invalid file metadata.')
    }

    if (size == null || size <= 0) {
      throw new Error('File is empty.')
    }

    const mimeType = type || mimeLookup(name)
    if (!mimeType) {
      throw new Error(`Unable to determine file type.`)
    }

    if (accept && !accept.some((rule) => matchesAccept(mimeType, rule))) {
      throw new Error('File type is not supported.')
    }

    const defaultExt = mimeExtension(mimeType) as Type | false
    if(!defaultExt || (types && !types.includes(defaultExt))) {
      throw new Error(`File type is not supported.`)
    }

    const maxSizeForType = resolveMaxSize(mimeType, defaultExt)
    if (size > maxSizeForType) {
      throw new Error(`File exceeds ${formatFileSize(maxSizeForType)} limit.`)
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

  return z
    .file()
    .transform((val, ctx) => {
      try {
        return transform(val)
      } catch (err) {
        ctx.addIssue({
          code: 'custom',
          input: val,
          message: (err as Error).message,
        })
        return z.NEVER
      }
    })
}

