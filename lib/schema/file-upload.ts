import { z } from 'zod'
import { extension as mimeExtension, lookup as mimeLookup, extensions as mimeExtensions } from 'mime-types'
import { formatFileSize, generateUUID } from '@/lib/util'

export interface FileUpload<Ext extends string = string> {
  id: string
  name: string
  url?: string
  size: number
  mimeExt: Ext
  mimeType: string
  blob: File
}

export interface FileUploadRules<Ext extends string = string> {
  /**
   * Allowed MIME types. Supports wildcards like `image/*`.
   * Examples: ['image/*'], ['image/png', 'image/jpeg']
   */
  readonly accept?: string[]

  /**
   * Allowed file extensions.
   * Examples: ['png', 'jpg', 'jpeg'], ['pdf', 'doc']
   */
  readonly extensions?: Ext[]

  /** Default max size in bytes (applies when no per-type / accept override exists) */
  readonly maxSize?: number

  /**
   * Optional max size overrides by MIME rule.
   * Keys can be exact MIME types (e.g. 'image/png') or wildcards (e.g. 'image/*').
   */
  readonly maxSizeByAccept?: Partial<Record<string, number>>

  /** Optional per-type max size in bytes (e.g. { png: 2_000_000, pdf: 10_000_000 }) */
  readonly maxSizeByExt?: Partial<Record<Ext, number>>
}

export function fileUpload<Ext extends string = string>(rules: FileUploadRules<Ext> = {}) {
  const { maxSize = Infinity, maxSizeByExt, maxSizeByAccept, accept, extensions } = rules

  function matchesAccept(mimeType: string, rule: string){
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1)
      return mimeType.startsWith(prefix)
    }
    return mimeType === rule
  }

  function resolveMaxSize(mimeType: string, ext: Ext) {
    const exact = maxSizeByAccept?.[mimeType]
    if (exact != null) return exact

    const byExt = maxSizeByExt?.[ext]
    if (byExt != null) return byExt

    const wildcardKey = Object
      .keys(maxSizeByAccept ?? {})
      .find((rule) => matchesAccept(mimeType, rule))
    const wildcard = wildcardKey ? maxSizeByAccept?.[wildcardKey] : undefined
    return wildcard ?? maxSize
  }

  function transform(file: File): FileUpload<Ext> {
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

    const mimeExt = mimeExtension(mimeType) as Ext | false
    if(!mimeExt || (extensions && !extensions.includes(mimeExt))) {
      throw new Error(`File type is not supported.`)
    }

    const maxSizeForType = resolveMaxSize(mimeType, mimeExt)
    if (size > maxSizeForType) {
      throw new Error(`File exceeds ${formatFileSize(maxSizeForType)} limit.`)
    }

    return {
      id: generateUUID(),
      name,
      size,
      mimeType,
      mimeExt,
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

export function getAllowedTypes(rules: Pick<FileUploadRules, 'accept' | 'extensions'>) {
  const accept = rules.accept ?? []
  rules.extensions?.forEach((ext) => {
    const mimeType = mimeLookup(ext)
    if(mimeType) accept.push(mimeType)
  })

  const extensions = rules.extensions ?? []
  rules.accept?.forEach((mimeType) => {
    if(mimeType.endsWith('/*')) {
      const mimePrefix = mimeType.slice(0, -1)
      for(const type in mimeExtensions) {
        if(type.startsWith(mimePrefix)) extensions.push(...mimeExtensions[type])
      }
      return
    }
    const ext = mimeExtension(mimeType)
    if(ext) extensions.push(ext)
  })

  return { accept, extensions }
}
