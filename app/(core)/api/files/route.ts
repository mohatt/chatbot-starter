import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { config } from '@/lib/config'
import { FileLoader, type FileLoaderMetadata } from '@/lib/document'
import { AppError } from '@/lib/errors'
import { postRequestBodySchema, getRequestBodySchema, deleteRequestBodySchema } from './schema'
import type { FileRecordInput } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/files'>>(
  async ({ api, session, request }) => {
    const { authz, db, vectorDb, storage, billing } = api
    const { user } = await session()
    const { tierConfig } = billing.getUserInfo(user)
    const { id, file, bucket, metadata } = postRequestBodySchema.parse(await request.formData())

    // External refs passed to file loader and stored in vector doc metadata
    const fileLoaderMetadata: FileLoaderMetadata = {
      projectId: metadata.namespace === 'project' ? metadata.projectId : undefined,
      chatId: metadata.namespace === 'chat' ? metadata.chatId : undefined,
    }

    // DB file record input
    const dbFile: FileRecordInput = {
      ...fileLoaderMetadata,
      id,
      userId: user.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      storageKey: '',
      url: '',
      bucket,
      metadata: {},
    }

    if (metadata.namespace === 'chat') {
      // Make sure the user has access to existing chats, non-existing ids are considered new chats
      const chat = await db.chats.findById(metadata.chatId)
      if (chat && !authz.can(user, 'write:chat', chat)) {
        throw new AppError('not_found:file')
      }
    } else if (metadata.namespace === 'project') {
      const project = await db.projects.findById(metadata.projectId)
      if (!authz.can(user, 'write:project', project)) {
        throw new AppError('not_found:file')
      }
      const fileCount = await db.files.countMany({ projectId: project.id })
      if (fileCount >= tierConfig.maxProjectFiles) {
        throw new AppError('rate_limit:file', 'Project has reached the maximum number of files.')
      }
    }

    // Cleanup logic
    const cleanupStack: Array<() => Promise<any>> = []
    const cleanup = async () => {
      await Promise.allSettled(
        cleanupStack.map(async (fn) => {
          await fn()
        }),
      )
    }

    // Upload the file to storage
    const blob = await storage.upload(id, file, { bucket, ...metadata })
    dbFile.url = blob.url
    dbFile.storageKey = blob.pathname
    cleanupStack.unshift(() => storage.delete(blob.pathname))

    if (bucket === 'retrieval') {
      try {
        const loader = new FileLoader(fileLoaderMetadata, config.fileLoader)
        const { docs, tokens } = await loader.load(id, file)
        if (docs.length && tokens) {
          cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${id}'`))
          await vectorDb.files.insert(docs)
        }
        dbFile.metadata.retrieval = { vectors: docs.length, tokens }
      } catch (err) {
        await cleanup()
        throw new AppError('internal:file', err as Error)
      }
    }

    const storedFile = await db.files
      .createWithQuota(dbFile, { maxCountPerProject: tierConfig.maxProjectFiles })
      .catch(async (err) => {
        await cleanup()
        throw err
      })

    return NextResponse.json(storedFile)
  },
  { namespace: 'file' },
)

export const GET = createApiHandler<RouteContext<'/api/files'>>(
  async ({ api, session, request }) => {
    const { db, authz } = api
    const { searchParams } = request.nextUrl
    const { projectId } = getRequestBodySchema.parse({
      projectId: searchParams.get('projectId') || undefined,
    })
    const { user } = await session()
    const project = await db.projects.findById(projectId)
    if (!authz.can(user, 'read:project', project)) {
      throw new AppError('not_found:project')
    }
    const result = await db.files.findMany({ projectId })
    return NextResponse.json(result.data)
  },
  { namespace: 'file' },
)

export const DELETE = createApiHandler<RouteContext<'/api/files'>>(
  async ({ api, session, request }) => {
    const { db, storage, vectorDb } = api
    const { searchParams } = request.nextUrl
    const { id } = deleteRequestBodySchema.parse({
      id: searchParams.get('id') || undefined,
    })
    const { user } = await session()
    const file = await db.files.deleteByIdForUser(id, user.id)
    if (!file) {
      throw new AppError('not_found:file')
    }

    const cleanupStack: Array<() => Promise<any>> = [() => storage.delete(file.storageKey)]
    if (file.bucket === 'retrieval') {
      cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${file.id}'`))
    }
    await Promise.allSettled(
      cleanupStack.map(async (fn) => {
        await fn()
      }),
    )

    return NextResponse.json(file)
  },
  { namespace: 'file' },
)
