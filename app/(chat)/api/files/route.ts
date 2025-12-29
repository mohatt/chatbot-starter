import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api'
import { del, put } from '@vercel/blob';
import { pick } from 'lodash-es'
import { config } from '@/lib/config'
import { FileLoader } from '@/lib/document'
import { validatePostRequest, validateGetRequest, validateDeleteRequest } from './schema'
import { AppError } from '@/lib/errors'
import type { FileRecordMetadata } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { authz, db, vectorDb } = api;
  const { user } = await session()
  const formData = await request.formData();
  const { file, type, metadata } = validatePostRequest(formData)

  const pathParts = ['v1', user.id]
  if (metadata.namespace === 'chat') {
    const chat = await db.chats.findById(metadata.chatId)
    if (!authz.can(user, 'write:chat', chat)) {
      throw new AppError('not_found:chat')
    }
    pathParts.push('c', metadata.chatId)
  } else if (metadata.namespace === 'project') {
    const project = await db.projects.findById(metadata.projectId)
    if (!authz.can(user, 'write:project', project)) {
      throw new AppError('not_found:project')
    }
    pathParts.push('p', metadata.projectId)
  }
  pathParts.push(type, `${file.id}.${file.type}`)

  const cleanupStack: Array<() => Promise<any>> = []
  const cleanup = async () => {
    await Promise.allSettled(cleanupStack.map(async (fn) => { await fn() }))
  }

  const blob = await put(pathParts.join('/'), file.blob, { access: 'public' })
    .catch((err) => {
      throw new AppError('internal:file', err)
    });
  cleanupStack.unshift(() => del(blob.pathname))

  const dbFileRefs = {
    userId: user.id,
    projectId: metadata.namespace === 'project' ? metadata.projectId : undefined,
    chatId: metadata.namespace === 'chat' ? metadata.chatId : undefined,
  } as const
  const dbFileMetadata: FileRecordMetadata = pick(file, 'name', 'type', 'size', 'mimeType')

  if (type === 'retrieval') {
    try {
      const loader = new FileLoader(dbFileRefs, config.fileLoader)
      const { docs, tokens } = await loader.load(file)

      if (docs.length && tokens) {
        cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${file.id}'`))
        await vectorDb.files.insert(docs)
      }

      dbFileMetadata.retrieval = {
        vectors: docs.length,
        tokens,
      }
    } catch (err) {
      await cleanup()
      throw new AppError('internal:file', err as Error)
    }
  }

  try {
    const dbFile = await db.files.create({
      ...dbFileRefs,
      id: file.id,
      type,
      storageKey: blob.pathname,
      url: blob.url,
      metadata: dbFileMetadata,
    })
    return NextResponse.json(dbFile)
  } catch (err) {
    await cleanup()
    throw new AppError('internal:file', err as Error)
  }
})

export const GET = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { db, authz } = api;
  const { projectId } = validateGetRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const project = await db.projects.findById(projectId);
  if (!authz.can(user, 'read:project', project)) {
    throw new AppError('not_found:project')
  }
  const result = await db.files.findByProject({ projectId });
  return NextResponse.json(result);
})

export const DELETE = createApiHandler<RouteContext<'/api/files'>>(async ({ api, session, request }) => {
  const { db, vectorDb } = api;
  const { id } = validateDeleteRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const file = await db.files.deleteByIdForUser(id, user.id);
  if (!file) {
    throw new AppError('not_found:file')
  }

  const cleanupStack: Array<() => Promise<any>> = [() => del(file.storageKey)]
  if (file.type === 'retrieval') {
    cleanupStack.unshift(() => vectorDb.files.deleteByFilter(`file.id='${file.id}'`))
  }
  await Promise.allSettled(cleanupStack.map(async (fn) => { await fn() }))

  return NextResponse.json(file);
})
