import { NextResponse } from 'next/server';
import {
  stepCountIs,
  streamText,
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'
import { geolocation } from "@vercel/functions";
import { generateUUID } from '@/lib/util'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { config } from '@/lib/config'
import { uuidV7 } from '@/lib/schema'
import { postRequestBodySchema, patchRequestBodySchema } from './schema'
import type { ChatMessage, ModelUsage } from '@/lib/ai'
import type { ChatProjectRecord, ChatRecord } from '@/lib/db'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic'

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
      await db.messages.deleteMany(id, message.id)
      // Guards against file urls from other chats/users being sent
      throw new AppError('bad_request:chat')
    }
  }

  let project: ChatProjectRecord | null = null
  if (chat.projectId) {
    project = await db.projects.findById(chat.projectId)
    if(!project) {
      throw new AppError('internal:chat')
    }
  }

  // Can be used to abort the generation stream
  // When triggered, the abort reason will be sent as an error part
  const generation = new AbortController()

  // Model usage is set during streamText.onFinish and saved to db later
  let chatUsage: ModelUsage | null = null
  // Usage cost is incremented during streamText.onStepFinish
  // Stream is aborted if it reaches max value
  let userChatCost = chatCredits.used

  // Fetch user location info
  const { city, country } = geolocation(request)
  const location = city && country ?  `${city}, ${country}` : null

  function getProviderOptions(): Record<string, any> {
    const { vendor, id } = model
    if(vendor === 'google') {
      const v2_5 = id.startsWith('google/gemini-2.5')
      const v3 = id.startsWith('google/gemini-3')
      return {
        google: {
          // https://ai.google.dev/gemini-api/docs/thinking#javascript
          thinkingConfig: {
            includeThoughts: isReasoning,
            ...(v3 ? {
              // For reasoning let the model decide how much thinking to use (dynamic)
              thinkingLevel: isReasoning ? undefined : 'low'
            } : v2_5 ? {
              thinkingBudget: isReasoning ? undefined : 1024
            } : {}),
          },
        } satisfies GoogleGenerativeAIProviderOptions
      }
    }

    if(vendor === 'anthropic') {
      return {
        anthropic: {
          // https://platform.claude.com/docs/en/build-with-claude/extended-thinking
          thinking: isReasoning
            ? { type: "enabled", budgetTokens: 6_144 }
            : undefined,
        } satisfies AnthropicProviderOptions
      }
    }

    if(vendor === 'openai') {
      return {
        openai: {
          reasoningEffort: isReasoning ? 'medium' : 'low',
          reasoningSummary: isReasoning ? 'auto' : undefined
        } satisfies OpenAIResponsesProviderOptions,
      }
    }

    return {}
  }

  const stream = createUIMessageStream<ChatMessage>({
    generateId: generateUUID,
    execute: async ({ writer: dataStream }) => {
      const result = streamText({
        model: chatModel,
        system: project != null
          ? ai.prompts.projectChatPrompt.toString({
            projectName: project.name,
            projectPrompt: project.prompt,
            timeZone,
            location
          })
          : ai.prompts.chatPrompt.toString({ timeZone, location }),
        messages: await convertToModelMessages(uiMessages),
        temperature: isReasoning ? undefined : 0.2,
        maxOutputTokens: 12_288,
        tools: ai.createChatTools({
          api,
          chat,
          model,
          project,
          dataStream,
        }),
        stopWhen: stepCountIs(5),
        abortSignal: AbortSignal.any([request.signal, generation.signal]),
        providerOptions: getProviderOptions(),
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
        system: ai.prompts.chatTitlePrompt.toString({ maxLength: maxGeneratedLength }),
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
