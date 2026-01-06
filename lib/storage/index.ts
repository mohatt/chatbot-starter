import { del, put } from '@vercel/blob'
import { AppError } from '@/lib/errors'
import { uuidV7, type FileUpload } from '@/lib/schema'
import type { Env } from '@/lib/env'
import type { StorageMetadata } from './schema'

export class Storage {
  private readonly baseUrl: string

  constructor(env: Pick<Env, 'BLOB_BASE_URL' | 'BLOB_READ_WRITE_TOKEN'>) {
    this.baseUrl = env.BLOB_BASE_URL
  }

  async upload(id: string, file: FileUpload, metadata: StorageMetadata) {
    const pathname = this.createPathname(id, file, metadata)
    return put(pathname, file.blob, { access: 'public' })
      .catch((err) => {
        throw new AppError('internal:file', err)
      });
  }

  async delete(pathname: string) {
    return del(pathname)
  }

  createPathname(id: string, file: FileUpload, metadata: StorageMetadata) {
    const pathParts = ['v1']
    if (metadata.namespace === 'chat') {
      pathParts.push('c', metadata.chatId)
    } else if (metadata.namespace === 'project') {
      pathParts.push('p', metadata.projectId)
    }
    pathParts.push(metadata.bucket, `${id}.${file.mimeExt}`)
    return pathParts.join('/')
  }

  getPathFromUrl(url: unknown) {
    if (typeof url !== 'string' || !url.startsWith(this.baseUrl)) return null
    return url.slice(this.baseUrl.length).replace(/^\/+/, '') || '/'
  }

  parseUrl(url: unknown) {
    const pathname = this.getPathFromUrl(url)
    if (!pathname) return null

    // Expected:
    //  - v1/c/{chatId}/{bucket}/{fileId}.{ext}
    //  - v1/p/{projectId}/{bucket}/{fileId}.{ext}
    const pathParts = pathname.split('/')
    if (pathParts.length !== 5) return null

    const [v, ns, nsId, bucket, filename] = pathParts
    if (v !== 'v1'
      || !['c', 'p'].includes(ns)
      || !uuidV7.safeParse(nsId).success
      || !filename
      || !bucket
    ) return null

    const dotIndex = filename.lastIndexOf('.')
    if (dotIndex <= 0) return null

    const id = filename.slice(0, dotIndex)
    if (!uuidV7.safeParse(id).success) return null

    const metadata: StorageMetadata = ns === 'c'
      ? { namespace: 'chat', chatId: nsId, bucket }
      : { namespace: 'project', projectId: nsId, bucket }

    return { id, metadata }
  }
}

export type { StorageMetadata }
