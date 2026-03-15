import { NextResponse } from 'next/server'
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
  createModelsRegistry,
  createFileToolModelOutput,
  type ChatMessage,
  type ModelUsage,
} from '@/lib/ai'
import { geolocation } from '@vercel/functions'
import { generateUUID } from '@/lib/utils'
import { createApiHandler } from '@/lib/api'
import { ChatTree } from '@/lib/ai/chat-tree'
import { AppError } from '@/lib/errors'
import { config } from '@/lib/config'
import { uuidV7 } from '@/lib/schema'
import { postRequestBodySchema, patchRequestBodySchema } from './schema'
import type { ChatRecord } from '@/lib/db'

export const POST = createApiHandler<RouteContext<'/api/chat/[id]'>>(
  async ({ api, request, params, session }) => {
    const { db, ai, authz, billing } = api
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const { message, projectId, timeZone, regenerate, createChat, model } =
      postRequestBodySchema.parse(await request.json())

    const billingPeriod = await billing.getCurrentPeriod(user)
    const { chatCredits, tierConfig } = billingPeriod.period
    if (chatCredits.remaining <= 0) {
      throw new AppError('rate_limit:chat')
    }
    let chatCreditsUpdated = false
    const updateChatCredits = async (chatUsageDelta: number) => {
      if (chatCreditsUpdated || chatUsageDelta <= 0) return
      chatCreditsUpdated = true
      await billingPeriod.update({ chatUsageDelta }).catch((error) => {
        console.error('Failed to update user chat usage:', {
          userId: user.id,
          error,
        })
      })
    }

    const fileIds = message.metadata.files?.map((f) => f.id) ?? []
    if (fileIds.length > tierConfig.maxMessageFiles) {
      throw new AppError('bad_request:chat')
    }
    const files = fileIds.length > 0 ? await db.files.findByIdsForUser(fileIds, user.id) : []
    if (files.length !== fileIds.length) {
      throw new AppError('bad_request:chat')
    }
    const fileIdsToUpdate: string[] = []
    for (const f of files) {
      if (f.chatId && f.chatId !== id) {
        throw new AppError('bad_request:chat')
      }
      if (f.chatId !== id) {
        fileIdsToUpdate.push(f.id)
      }
    }

    const parentId = message.metadata.parentId
    const uiMessage: ChatMessage = {
      ...message,
      metadata: {
        parentId,
        files: files.map(({ id, name, mimeType, size, metadata, url, createdAt }) => {
          return { id, name, mimeType, size, url, metadata, createdAt }
        }),
      },
    }

    let chat: ChatRecord
    if (createChat) {
      chat = await db.chats.create({
        id,
        title: [
          ...files.map((f) => `[File: ${f.name}`).concat(files.length > 0 ? '' : []),
          ...message.parts.map(({ text }) => text),
        ].join('\n'),
        userId: user.id,
        projectId,
      })
    } else {
      const dbChat = await db.chats.findById(id)
      if (!authz.can(user, 'write:chat', dbChat) || dbChat.projectId !== projectId) {
        throw new AppError('not_found:chat')
      }
      chat = dbChat
    }

    const chatModel = ai.getLanguageModel(model.key)
    const isReasoning = model.key.modifiers.thinking === true

    // Fetch models registry and look up the selected model
    const modelsRegistry = await createModelsRegistry()
    const modelMeta = modelsRegistry.getModelMeta(model.key)
    if (!modelMeta.tool_call) {
      throw new Error(`Model ${model.key.id} does not support tool calling.`)
    }
    if (isReasoning && !modelMeta.reasoning) {
      throw new Error(`Model ${model.key.id} does not support reasoning.`)
    }

    const dbMessages = await db.messages.findMany(id, tierConfig.maxChatMessages)
    if (dbMessages.nextCursor) {
      throw new AppError('bad_request:chat')
    }
    const chatTree = new ChatTree(dbMessages.data)
    const uiMessages = await (async () => {
      if (regenerate) {
        // The user message should be already in the tree
        return chatTree.buildPathFromLeafNode(message.id)
      }

      chatTree.addNode(uiMessage)
      await db.messages.insertMany(id, [uiMessage])
      return chatTree.buildLatestPath()
    })()

    // Update attached files if any
    if (fileIdsToUpdate.length > 0) {
      await db.files.updateByIdsForUser(fileIdsToUpdate, user.id, {
        chatId: id,
        messageId: message.id,
      })
    }

    const location = geolocation(request)
    const project = projectId ? await db.projects.findById(projectId) : null
    const projectFiles = projectId ? await db.files.countMany({ projectId }) : null

    // Can be used to abort the generation stream
    // When triggered, the abort reason will be sent as an error part
    const generation = new AbortController()

    // Final model usage is set during `onFinish()` and saved to db at the end of the stream
    let chatUsage: ModelUsage | null = null
    // Steps cost is incremented during `onStepFinish()`
    // Stream is aborted during `prepareStep()` if user usage reaches max value
    let chatStepsCost = 0

    const stream = createUIMessageStream<ChatMessage>({
      generateId: generateUUID,
      execute: async ({ writer: dataStream }) => {
        const chatContext = createChatContext({
          api,
          chat,
          model,
          modelMeta,
          message: uiMessage,
          project,
          projectFiles,
          timeZone,
          location,
          dataStream,
        })
        const systemPrompt = project != null ? projectChatPrompt : chatPrompt
        const chatTools = createChatTools(chatContext)
        const modelMessages = await convertToModelMessages(
          uiMessages.flatMap((msg) => {
            if (msg.role !== 'user' || !msg.metadata?.files?.length) return msg
            return [
              {
                role: 'system',
                parts: [
                  {
                    type: 'text' as const,
                    text: `User has attached these files with their next message:\n${JSON.stringify(
                      msg.metadata.files.map(createFileToolModelOutput),
                    )}`,
                  },
                ],
              },
              msg,
            ]
          }),
          { tools: chatTools },
        )

        const result = streamText({
          model: chatModel,
          system: systemPrompt.toString(chatContext),
          messages: modelMessages,
          temperature: isReasoning ? undefined : 0.2,
          maxOutputTokens: 20_480,
          activeTools: Object.keys(chatTools) as Array<keyof typeof chatTools>,
          tools: chatTools,
          stopWhen: stepCountIs(8),
          abortSignal: AbortSignal.any([request.signal, generation.signal]),
          providerOptions: createChatOptions(chatContext),
          prepareStep: async () => {
            if (chatStepsCost + chatCredits.used >= chatCredits.max) {
              generation.abort(new AppError('rate_limit:chat'))
              await updateChatCredits(chatStepsCost)
            }
            return {}
          },
          onStepFinish: ({ usage }) => {
            try {
              const stepUsage = modelsRegistry.getModelUsage(model.key, usage)
              chatStepsCost += stepUsage.cost.total ?? 0
            } catch (error) {
              console.error('Failed to calculate model step usage:', {
                key: model.key,
                stepUsage: usage,
                error,
              })
              generation.abort(new AppError('internal:chat', (error as Error).message))
            }
          },
          onFinish: ({ totalUsage }) => {
            try {
              // Calculate model usage
              chatUsage = modelsRegistry.getModelUsage(model.key, totalUsage)
              dataStream.write({
                type: 'data-usage',
                data: chatUsage,
                transient: true, // won't be persisted to storage
              })
            } catch (error) {
              console.error('Failed to calculate model final usage:', {
                key: model.key,
                totalUsage,
                error,
              })
            }
          },
          onAbort: () => {
            if (generation.signal.aborted) {
              dataStream.write({
                type: 'error',
                errorText: (generation.signal.reason as AppError).message,
              })
            }
          },
          onError: ({ error }) => {
            console.error('streamText error:', { error })
          },
        })

        dataStream.merge(
          result.toUIMessageStream({
            sendSources: true, // Mainly used for google search sources
            messageMetadata: ({ part }) => {
              if (part.type === 'start') {
                return { parentId: message.id, model: model.key }
              }
            },
          }),
        )
      },
      onFinish: async ({ messages }) => {
        const chatCost = chatUsage?.cost.total ?? chatStepsCost ?? 0
        await Promise.all([
          db.messages.insertMany(id, messages).catch((error) => {
            console.error('Failed to save chat messages:', {
              chatId: id,
              error,
            })
          }),
          updateChatCredits(chatCost),
        ])
      },
      onError: (_err) => {
        return 'Oops, an error occurred!'
      },
    })

    return createUIMessageStreamResponse({ stream })
  },
  { namespace: 'chat' },
)

export const PATCH = createApiHandler<RouteContext<'/api/chat/[id]'>>(
  async ({ api, session, request, params }) => {
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const body = patchRequestBodySchema.parse(await request.json())
    const updatedChat = await api.db.chats.updateByIdForUser(id, user.id, body)
    return NextResponse.json(updatedChat)
  },
  { namespace: 'chat' },
)

export const GET = createApiHandler<RouteContext<'/api/chat/[id]'>>(
  async ({ api, session, params }) => {
    const { db, ai, authz } = api
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    let chat = await db.chats.findById(id)
    if (!authz.can(user, 'read:chat', chat)) {
      throw new AppError('not_found:chat')
    }

    // Generate title for new chats
    if (chat.isTitlePending) {
      const { model, fallback, maxGeneratedLength } = config.chat.title
      let title = fallback
      try {
        const { text } = await generateText({
          model: ai.getLanguageModel(model),
          prompt: chatTitlePrompt.toString({
            message: chat.title,
            maxLength: maxGeneratedLength,
          }),
          temperature: 0.2,
        })
        title = text
      } catch (err) {
        console.warn('Failed to generate chat title:', id, err)
      }
      chat = (await db.chats.updateByIdForUser(id, user.id, { title, isTitlePending: false }))!
    }

    return NextResponse.json(chat)
  },
  { namespace: 'chat' },
)

export const DELETE = createApiHandler<RouteContext<'/api/chat/[id]'>>(
  async ({ api, session, params }) => {
    const { authz, db } = api
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const chat = await db.chats.findById(id)
    if (!authz.can(user, 'delete:chat', chat)) {
      throw new AppError('not_found:chat')
    }
    const deletedChat = await db.chats.deleteById(id)
    return NextResponse.json(deletedChat)
  },
  { namespace: 'chat' },
)
