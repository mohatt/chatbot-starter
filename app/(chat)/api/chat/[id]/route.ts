import { NextResponse } from 'next/server';
import {
  stepCountIs,
  streamText,
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'
import {
  chatPrompt,
  chatTitlePrompt,
  projectChatPrompt,
  createChatTools,
  createChatContext,
  createChatOptions,
  type ChatMessage,
  type ModelUsage,
} from '@/lib/ai'
import { geolocation } from "@vercel/functions";
import { generateUUID } from '@/lib/utils'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { config } from '@/lib/config'
import { uuidV7 } from '@/lib/schema'
import { postRequestBodySchema, patchRequestBodySchema } from './schema'
import type { ChatRecord } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, request, params, session }) => {
  const { db, ai, authz, billing, storage } = api;
  const id = uuidV7.parse(params.id)
  const { user } = await session()
  const { message, projectId, timeZone, regenerate, createChat, model } = postRequestBodySchema.parse(await request.json())
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

  if (messageFiles.length > config.chat.message.maxFileParts) {
    throw new AppError('bad_request:chat')
  }

  const billingPeriod = await billing.getCurrentPeriod(user)
  const { chatCredits } = billingPeriod.period
  if(chatCredits.remaining <= 0) {
    throw new AppError('rate_limit:chat')
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

  const chatModel = await ai.getLanguageModel(model.key)
  const isReasoning = model.key.modifiers.thinking === true

  if (regenerate) {
    await db.messages.deleteMany(id, message.id)
  }

  const { data: dbMessages } = await db.messages.findMany(id, 25);
  const uiMessages = [...dbMessages, message];

  await db.messages.insertMany(id, [message])

  // Update attached files if any
  if (messageFiles.length > 0) {
    const updatedFiles = await db.files.updateByIdsForUser(messageFiles, user.id, {
      chatId: id,
      messageId: message.id,
    })
    if (updatedFiles.length !== messageFiles.length) {
      // Guard against invalid file urls from being stored
      await db.messages.deleteMany(id, message.id)
      throw new AppError('bad_request:chat')
    }
  }

  const location = geolocation(request)
  const project = chat.projectId
    ? await db.projects.findById(chat.projectId)
    : null

  // Can be used to abort the generation stream
  // When triggered, the abort reason will be sent as an error part
  const generation = new AbortController()

  // Model usage is set during streamText.onFinish and saved to db later
  let chatUsage: ModelUsage | null = null
  // Usage cost is incremented during streamText.onStepFinish
  // Stream is aborted if it reaches max value
  let userChatCost = chatCredits.used

  const stream = createUIMessageStream<ChatMessage>({
    generateId: generateUUID,
    execute: async ({ writer: dataStream }) => {
      const context = createChatContext({
        api,
        chat,
        model,
        project,
        timeZone,
        location,
        dataStream,
      })
      const prompt = project != null ? projectChatPrompt : chatPrompt
      const result = streamText({
        model: chatModel,
        system: prompt.toString(context),
        messages: await convertToModelMessages(uiMessages),
        temperature: isReasoning ? undefined : 0.2,
        maxOutputTokens: 12_288,
        tools: createChatTools(context),
        stopWhen: stepCountIs(5),
        abortSignal: AbortSignal.any([request.signal, generation.signal]),
        providerOptions: createChatOptions(context),
        onStepFinish: async ({ usage }) => {
          try {
            const stepUsage = await ai.getModelUsage(model.key, usage)
            const stepCost = stepUsage.cost.total ?? 0
            if (stepCost > 0) {
              userChatCost += stepCost
              if(userChatCost >= chatCredits.max) {
                generation.abort(new AppError('rate_limit:chat'))
              }
            }
          } catch (error) {
            console.error('Failed to calculate model step usage:', {
              key: model.key,
              stepUsage: usage,
              error
            })
            generation.abort(new AppError('internal:chat', (error as Error).message))
          }
        },
        onFinish: async ({ totalUsage }) => {
          try {
            // Calculate model usage
            chatUsage = await ai.getModelUsage(model.key, totalUsage)
          } catch (error) {
            console.error('Failed to calculate model final usage:', {
              key: model.key,
              totalUsage,
              error
            })
          }
          console.log(chatUsage)
          dataStream.write({
            type: 'data-notification',
            data: { message: `Tokens used: ${totalUsage.totalTokens}`, level: 'info' },
            transient: true, // won't be persisted to storage
          });
        },
        onAbort: () => {
          if (generation.signal.aborted) {
            dataStream.write({
              type: 'error',
              errorText: (generation.signal.reason as AppError).message,
            });
          }
          console.log('streamText aborted');
        },
        onError: (err) => {
          console.error('streamText error:', err);
        }
      });

      dataStream.merge(
        result.toUIMessageStream({
          sendSources: model.vendor === 'google', // for google search
          messageMetadata: ({ part }) => {
            console.log('messageMetadata', part.type)
            if (part.type === 'finish') {
              return {
                model: model.key,
                usage: chatUsage ?? { tokens: {}, cost: {} },
              }
            }
          },
        }),
      );
    },
    onFinish: async ({ messages, finishReason, isAborted }) => {
      console.log('saveMessage', { messages, finishReason, isAborted, chatUsage })
      const tasks: Array<Promise<any>> = [
        db.messages
          .insertMany(id, messages)
          .catch((error) => {
            console.error('Failed to save chat messages:', {
              chatId: id,
              error,
            });
          })
      ]

      const totalCost = chatUsage?.cost.total ?? 0
      if (totalCost > 0) {
        tasks.push(
          billingPeriod.update({ chatUsageDelta: totalCost })
            .catch((error) => {
              console.error('Failed to update user chat usage:', {
                userId: user.id,
                error,
              });
            })
        )
      }

      await Promise.all(tasks)
    },
    onError: (_err) => {
      return 'Oops, an error occurred!'
    },
  })

  return createUIMessageStreamResponse({ stream });
}, { namespace: 'chat' });

export const PATCH = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, request, params }) => {
  const id = uuidV7.parse(params.id)
  const { user } = await session()
  const body = patchRequestBodySchema.parse(await request.json())
  const updatedChat = await api.db.chats.updateByIdForUser(id, user.id, body);
  return NextResponse.json(updatedChat);
}, { namespace: 'chat' });

export const GET = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, params }) => {
  const { db, ai, authz } = api;
  const id = uuidV7.parse(params.id)
  const { user } = await session()
  let chat = await db.chats.findById(id);
  if(!authz.can(user, 'read:chat', chat)) {
    throw new AppError('not_found:chat')
  }

  // Generate title for new chats
  if (chat.isTitlePending) {
    const { model, fallback, maxGeneratedLength } = config.chat.title
    let title = fallback
    try {
      const { text } = await generateText({
        model: await ai.getLanguageModel(model),
        system: chatTitlePrompt.toString({ maxLength: maxGeneratedLength }),
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
}, { namespace: 'chat' });

export const DELETE = createApiHandler<RouteContext<'/api/chat/[id]'>>(async ({ api, session, params }) => {
  const { authz, db } = api;
  const id = uuidV7.parse(params.id)
  const { user } = await session()
  const chat = await db.chats.findById(id);
  if(!authz.can(user, 'delete:chat', chat)) {
    throw new AppError('not_found:chat')
  }
  const deletedChat = await db.chats.deleteById(id);
  return NextResponse.json(deletedChat);
}, { namespace: 'chat' });
