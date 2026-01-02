import { NextResponse } from 'next/server';
import { stepCountIs, streamText, generateText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, smoothStream } from 'ai'
import { geolocation } from "@vercel/functions";
import { generateUUID } from '@/lib/util'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { validateUUIDv7 } from '@/lib/schema'
import { validatePatchRequest, validatePostRequest } from './schema'
import { config } from '@/lib/config'
import type { ChatMessage } from '@/lib/ai'
import type { ChatProjectRecord, ChatRecord } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, request, params, session }) => {
  const { db, ai, authz, storage } = api;
  const id = validateUUIDv7(params.id)
  const body = validatePostRequest(await request.json())
  const { user } = await session()
  const { message, projectId, timeZone, regenerate, createChat } = body;
  const messageText: string[] = []
  const messageFiles: string[] = []
  for (const part of message.parts) {
    if (part.type === 'text') {
      messageText.push(part.text)
      continue
    }
    const file = storage.parseUrl(part.url)
    if (file?.metadata.namespace !== 'chat' || file.metadata.chatId !== id) {
      throw new AppError('bad_request:chat')
    }
    messageFiles.push(file.id)
    messageText.push(`[File: ${part.filename}`)
  }

  let chat: ChatRecord
  if (createChat) {
    chat = await db.chats.create({
      id,
      title: messageText.join('\n'),
      userId: user.id,
      projectId,
    })
  } else {
    const dbChat = await db.chats.findById(id);
    if(!authz.can(user, 'write:chat', dbChat) || dbChat.projectId !== projectId) {
      throw new AppError('not_found:chat')
    }
    chat = dbChat
  }

  // Update attached files if any
  if (messageFiles.length > 0) {
    const updatedFiles = await db.files.updateByIdsForUser(messageFiles, user.id, { chatId: id })
    if (updatedFiles.length !== messageFiles.length) {
      // Guards against file urls from other chats/users being sent
      throw new AppError('bad_request:chat')
    }
  }

  if (regenerate) {
    await db.messages.deleteMany(id, message.id)
  }

  const { data: dbMessages } = await db.messages.findMany(id, 10);
  const uiMessages = [...dbMessages, message];

  await db.messages.insertMany(id, [message])

  let project: ChatProjectRecord | null = null
  if (chat.projectId) {
    project = await db.projects.findById(chat.projectId)
    if(!project) {
      throw new AppError('internal:chat')
    }
  }

  const { city, country } = geolocation(request)
  const location = city && country ?  `${city}, ${country}` : 'Dubai, UAE' // @todo change to null

  const stream = createUIMessageStream<ChatMessage>({
    generateId: generateUUID,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: ai.chat,
        system: ai.prompts.chatPrompt.toString({ timeZone, location }),
        messages: convertToModelMessages(uiMessages),
        temperature: 0.2,
        maxOutputTokens: 800,
        tools: ai.createChatTools({ api, dataStream, chat, project }),
        stopWhen: stepCountIs(5),
        abortSignal: request.signal,
        experimental_transform: smoothStream({ chunking: "word" }),
        onFinish: (res) => {
          // console.log(JSON.stringify(res.request, null, 2))
          console.log(res.totalUsage)
          dataStream.write({
            type: 'data-notification',
            data: { message: `Tokens used: ${res.totalUsage.totalTokens}`, level: 'info' },
            transient: true, // won't be persisted to storage
          });
        },
        onAbort: () => {
          console.log('streamText aborted');
        },
        onError: (err) => {
          console.error('streamText error:', err);
        }
      });

      dataStream.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages }) => {
      await db.messages.insertMany(id, messages).catch((err) => {
        console.warn('Failed to save chat messages:', id, err);
      })
    },
    onError: (_err) => {
      return 'Oops, an error occurred!'
    },
  })

  return createUIMessageStreamResponse({ stream });
});

export const PATCH = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, request, params }) => {
  const id = validateUUIDv7(params.id)
  const body = validatePatchRequest(await request.json())
  const { user } = await session()
  const updatedChat = await api.db.chats.updateByIdForUser(id, user.id, body);
  return NextResponse.json(updatedChat);
});

export const GET = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, params }) => {
  const { db, ai, authz } = api;
  const id = validateUUIDv7(params.id)
  const { user } = await session()
  let chat = await db.chats.findById(id);
  if(!authz.can(user, 'read:chat', chat)) {
    throw new AppError('not_found:chat')
  }

  // Generate title for new chats
  if (chat.isTitlePending) {
    let title = config.chat.title.fallback
    try {
      const { text } = await generateText({
        model: ai.chat,
        system: ai.prompts.chatTitlePrompt.toString({ maxLength: config.chat.title.maxGeneratedLength }),
        prompt: chat.title,
        temperature: 0.2,
      });
      title = text
    } catch (err) {
      console.warn('Failed to generate chat title:', id, err);
    }
    chat = (await db.chats.updateByIdForUser(id, user.id, { title, isTitlePending: false }))!;
  }

  return NextResponse.json(chat);
});

export const DELETE = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, params }) => {
  const { authz, db } = api;
  const id = validateUUIDv7(params.id)
  const { user } = await session()
  const chat = await db.chats.findById(id);
  if(!authz.can(user, 'delete:chat', chat)) {
    throw new AppError('not_found:chat')
  }
  const deletedChat = await db.chats.deleteById(id);
  return NextResponse.json(deletedChat);
});
