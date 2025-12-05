import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { posix } from 'node:path'
import { extension as mimeExtension, lookup as mimeLookup } from 'mime-types'
import { AsyncCaller, AsyncCallerOptions } from '@/lib/async-caller'
import { formatFileSize } from '@/lib/util'
import type { FileUpload, FileUploadRules, FileUploadResult, FilesUploadResult } from './types'

export interface UrlUploadOptions {
  fetch?: {
    timeout?: number
    headers?: Record<string, string>
    signal?: AbortSignal
  }
  asyncCaller?: AsyncCallerOptions
}

export function createUrlUploadSchema<Type extends string = string>(rules: FileUploadRules<Type>, options?: UrlUploadOptions) {
  const { min = 0, max = Infinity, maxSize = Infinity, maxTotalSize = Infinity, accept, types } = rules;

  const urlSchema = z.string().url().nonempty()
  const urlArraySchema = z.array(urlSchema)
    .min(min, `Choose at least ${min === 1 ? `one URL` : `${min} URLs`} to upload.`)
    .max(max, `You can only upload up to ${max} URLs at a time.`)

  function getOptions(override?: UrlUploadOptions) {
    return {
      fetch: {
        timeout: 1e4,
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          ...options?.fetch?.headers,
          ...override?.fetch?.headers
        },
        ...options?.fetch,
        ...override?.fetch
      },
      asyncCaller: {
        ...options?.asyncCaller,
        ...override?.asyncCaller
      }
    }
  }

  function createTransformer(override?: UrlUploadOptions) {
    const opts = getOptions(override)
    const { timeout, headers, signal } = opts.fetch
    const caller = new AsyncCaller(opts.asyncCaller);
    return async function transform(url: string): Promise<FileUpload<Type>> {
      const timeoutSignal = AbortSignal.timeout(timeout)
      const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal
      const res = await caller.fetch(url, {
        redirect: 'follow',
        signal: fetchSignal,
        headers,
      })

      if (!res.body || [204, 205].includes(res.status)) {
        throw new Error('Unable to fetch content.')
      }

      let size = Number(res.headers.get("content-length") || 0);
      if (size > maxSize) {
        await res.body.cancel();
        throw new Error(`Content exceeds ${formatFileSize(maxSize)} limit.`)
      }

      const fileName = getFilenameFromResponse(res);
      const contentType = res.headers.get('content-type')?.split(';', 1)[0].trim();
      const mimeType = contentType || (fileName && mimeLookup(fileName))
      if (!mimeType) {
        await res.body.cancel();
        throw new Error(`Unable to determine content type.`)
      }

      if(accept && !accept.includes(mimeType)) {
        await res.body.cancel();
        throw new Error(`Content type is not supported.`)
      }

      const defaultExt = mimeExtension(mimeType) as Type | false
      if(!defaultExt || (types && !types.includes(defaultExt))) {
        await res.body.cancel();
        throw new Error(`Content type is not supported.`)
      }

      // stream body data
      const reader = res.body.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      size = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        size += value.byteLength
        if (size > maxSize) {
          await reader.cancel()
          throw new Error(`Content exceeds ${formatFileSize(maxSize)} limit.`)
        }

        chunks.push(value)
      }

      return {
        id: randomUUID(),
        name: fileName || url,
        url,
        size,
        mimeType,
        type: defaultExt,
        blob: new Blob(chunks, { type: mimeType })
      }
    }
  }

  async function parseArray(input: unknown, overrideOptions?: UrlUploadOptions): Promise<FilesUploadResult<Type>> {
    const zResult = urlArraySchema.safeParse(input);
    if(!zResult.success) {
      return {
        data: null,
        errors: zResult.error.issues.map(({ message }) => ({ message }))
      }
    }

    let totalSize = 0
    const transform = createTransformer(overrideOptions)
    const promises = await Promise.allSettled(zResult.data.map(async (url) => {
      const upload = await transform(url)
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

  async function parse(input: unknown, overrideOptions?: UrlUploadOptions): Promise<FileUploadResult<Type>> {
    const transform = createTransformer(overrideOptions)
    try {
      const url = urlSchema.parse(input);
      const upload = await transform(url)
      return { data: upload, error: null }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { data: null, error: err.issues[0].message }
      }
      return { data: null, error: (err as Error).message}
    }
  }

  return { parse, parseArray }
}

function getFileNameFromHeaders(cd: string | null){
  if (!cd) return null

  // RFC 5987: filename*=UTF-8''encoded%20name.ext
  const star = cd.match(/filename\*\s*=\s*([^;]+)/i)?.[1]
  if (star) {
    const v = star.trim().replace(/^UTF-8''/i, '').replace(/^"|"$/g, '')
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }

  // filename="name.ext" or filename=name.ext
  const plain = cd.match(/filename\s*=\s*([^;]+)/i)?.[1]
  if (plain) return plain.trim().replace(/^"|"$/g, '')

  return null
}

function getFileNameFromUrl(url: string) {
  const pathname = new URL(url).pathname
  let base = posix.basename(pathname)
  if (!base || base === '/') return null
  try {
    base = decodeURIComponent(base)
  } catch {}
  if (!base || !posix.extname(base) || base.endsWith('.')) return null
  return base
}

function getFilenameFromResponse(res: Response) {
  const fileName = getFileNameFromHeaders(res.headers.get('content-disposition'))
    || getFileNameFromUrl(res.url)
    || null
  return fileName && fileName
    .replace(/[/\\?%*:|"<>]/g, '-') // strip illegal chars
    .replace(/\s+/g, ' ')
    .trim()
}
