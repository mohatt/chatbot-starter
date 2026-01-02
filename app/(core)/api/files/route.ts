import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api'
import { config } from '@/lib/config'
import { FileLoader, type FileLoaderMetadata } from '@/lib/document'
import { validatePostRequest, validateGetRequest, validateDeleteRequest } from './schema'
import { AppError } from '@/lib/errors'
import type { FileRecordInput } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { authz, db, vectorDb, storage } = api;
  const { user } = await session()
  const formData = await request.formData();
  const { file, bucket, metadata } = validatePostRequest(formData)

  // External refs passed to file loader and stored in db
  const fileLoaderMetadata: FileLoaderMetadata = {
    userId: user.id,
    projectId: metadata.namespace === 'project' ? metadata.projectId : undefined,
    chatId: metadata.namespace === 'chat' ? metadata.chatId : undefined,
  }

  // DB file record input
  const dbFile: FileRecordInput = {
    ...fileLoaderMetadata,
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    storageKey: '',
    url: '',
    bucket,
    metadata: {},
  }

  if (metadata.namespace === 'chat') {
    const chat = await db.chats.findById(metadata.chatId)
    // Ignore checking non-existing chats
    if (chat && !authz.can(user, 'write:chat', chat)) {
      throw new AppError('not_found:file')
    }
  } else if (metadata.namespace === 'project') {
    const project = await db.projects.findById(metadata.projectId)
    if (!authz.can(user, 'write:project', project)) {
      throw new AppError('not_found:file')
    }
  }

  // Cleanup logic
  const cleanupStack: Array<() => Promise<any>> = []
  const cleanup = async () => {
    await Promise.allSettled(cleanupStack.map(async (fn) => { await fn() }))
  }

  // Upload the file to storage
  const blob = await storage.upload(file, { bucket, ...metadata })
  dbFile.url = blob.url
  dbFile.storageKey = blob.pathname
  cleanupStack.unshift(() => storage.delete(blob.pathname))

  if (bucket === 'retrieval') {
    try {
      const loader = new FileLoader(fileLoaderMetadata, config.fileLoader)
      const { docs, tokens } = await loader.load(file)
      if (docs.length && tokens) {
        cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${file.id}'`))
        await vectorDb.files.insert(docs)
      }
      dbFile.metadata.retrieval = { vectors: docs.length, tokens }
    } catch (err) {
      await cleanup()
      throw new AppError('internal:file', err as Error)
    }
  }

  const storedFile = await db.files.create(dbFile)
    .catch(async (err) => {
      await cleanup()
      throw err
    })

  return NextResponse.json(storedFile)
})

export const GET = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { db, authz } = api;
  const { projectId } = validateGetRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const project = await db.projects.findById(projectId);
  if (!authz.can(user, 'read:project', project)) {
    throw new AppError('not_found:project')
  }
  const result = await db.files.findMany({ projectId });
  return NextResponse.json(result.data);
})

export const DELETE = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { db, storage, vectorDb } = api;
  const { id } = validateDeleteRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const file = await db.files.deleteByIdForUser(id, user.id);
  if (!file) {
    throw new AppError('not_found:file')
  }

  const cleanupStack: Array<() => Promise<any>> = [() => storage.delete(file.storageKey)]
  if (file.bucket === 'retrieval') {
    cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${file.id}'`))
  }
  await Promise.allSettled(cleanupStack.map(async (fn) => { await fn() }))

  return NextResponse.json(file);
})
