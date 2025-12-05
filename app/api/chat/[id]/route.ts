import { NextResponse } from 'next/server';
import { createApi } from '@/lib/api'
import type { ChatRecordContextFile } from '@/lib/db'
import { FileLoader, type FileLoaderDoc } from '@/lib/document'
import { AppError } from '@/lib/errors'
import { createFileUploadSchema } from '@/lib/upload'
import { config } from '@/lib/config'

export const runtime = 'nodejs';

const fileUpload = createFileUploadSchema(config.context.uploads.files.rules)

export const POST = createApi<RouteContext<'/api/chat/[id]'>>(async ({ api, request, params }) => {
  const { db, vectorDb } = api;
  const { id } = params;
  const chat = id === 'new'
    ? await db.chats.create({
      title: 'New Session',
      userId: api.auth.user.id,
      context: {
        size: 0,
        vectors: 0,
        tokens: 0,
        files: []
      },
    })
    : await db.chats.getById(id);
  await api.ensureChatAccess('write', chat)

  const formData = await request.formData();
  const files = await fileUpload.parseArray(formData.getAll('files'));
  // @todo handle partial data errors and newly created chat
  if (!files.data) {
    throw new AppError('bad_request:chat', files.errors[0]?.message)
  }

  const fileContentVectors: FileLoaderDoc[] = []
  const contextFiles: ChatRecordContextFile[] = [];

  const loader = new FileLoader({ chatId: chat!.id }, config.fileLoader);
  let totalSize = 0
  let totalTokens = 0
  for (const file of files.data) {
    try {
      const { docs, tokens } = await loader.load(file)
      if (!docs.length || !tokens) {
        continue;
      }
      const { blob, ...fileInfo } = file
      contextFiles.push({
        ...fileInfo,
        tokens: tokens,
        vectors: docs.length,
      })
      fileContentVectors.push(...docs)
      totalSize += file.size;
      totalTokens += tokens;
    } catch (err) {
      throw new AppError('bad_request:chat', `Failed to load ${file.name}`)
    }
  }

  if (!fileContentVectors.length) {
    throw new AppError('bad_request:chat', 'No readable text found in the uploaded files.')
  }

  await vectorDb.content.insert(fileContentVectors)

  const baseCtx = chat!.context
  const updatedChat = await db.chats.update(chat!.id, {
    context: {
      size: baseCtx.size + totalSize,
      vectors: baseCtx.vectors + fileContentVectors.length,
      tokens: baseCtx.tokens + totalTokens,
      files: [...baseCtx.files, ...contextFiles],
    },
  })

  return NextResponse.json(updatedChat, { status: id === 'new' ? 201 : 200 });
});

export const GET = createApi<RouteContext<'/api/chat/[id]'>>(async ({ api, params }) => {
  const chat = await api.db.chats.getById(params.id);
  await api.ensureChatAccess('read', chat)
  return NextResponse.json(chat);
});

export const DELETE = createApi<RouteContext<'/api/chat/[id]'>>(async ({ api, params }) => {
  const { db, vectorDb } = api;
  const { id } = params;
  const chat = await db.chats.getById(id);
  await api.ensureChatAccess('delete', chat)
  await vectorDb.content.deleteByFilter(`chatId='${id}'`)
  const deletedChat = await db.chats.delete(id);
  return NextResponse.json(deletedChat);
});
