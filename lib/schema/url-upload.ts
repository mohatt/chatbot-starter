import { z } from 'zod'
import { posix } from 'node:path'
import { extension as mimeExtension, lookup as mimeLookup } from 'mime-types'
import { AsyncCaller, AsyncCallerOptions } from '@/lib/async-caller'
import { formatFileSize, generateUUID } from '@/lib/util'
import type { FileUpload, FileUploadRules } from './file-upload'

export interface UrlUploadOptions {
  fetch?: {
    timeout?: number
    headers?: Record<string, string>
    signal?: AbortSignal
  }
  asyncCaller?: AsyncCallerOptions
}

export function urlUpload<Type extends string = string>(rules: FileUploadRules<Type>, options?: UrlUploadOptions) {
  const { maxSize = Infinity, accept, extensions } = rules

  const opts = {
    fetch: {
      timeout: 1e4,
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        ...options?.fetch?.headers,
      },
      ...options?.fetch,
    },
    asyncCaller: options?.asyncCaller
  }

  async function transform(url: string): Promise<FileUpload<Type>> {
    const { timeout, headers, signal } = opts.fetch
    const caller = new AsyncCaller(opts.asyncCaller);
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
    if(!defaultExt || (extensions && !extensions.includes(defaultExt))) {
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
      id: generateUUID(),
      name: fileName || url,
      url,
      size,
      mimeType,
      mimeExt: defaultExt,
      blob: new File(chunks, fileName || url, { type: mimeType }),
    }
  }

  return z
    .url()
    .transform(async (val, ctx) => {
      try {
        return await transform(val)
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
