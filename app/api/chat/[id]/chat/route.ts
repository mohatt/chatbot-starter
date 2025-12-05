import { stepCountIs, streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, smoothStream, type ModelMessage } from 'ai'
import type { ChatMessage } from '@/lib/ai'
import { generateUUID } from '@/lib/util'
import { createApi } from '@/lib/api'
import { validatePostRequestBody } from './schema'

export const runtime = 'nodejs';

export function getTextFromMessage(message: ModelMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export const POST = createApi<RouteContext<'/api/chat/[id]/chat'>>(async ({ api, request, params }) => {
  const { db, ai } = api;
  const { id } = params;
  const { message, timeZone, regenerate } = validatePostRequestBody(await request.json())
  const chat = await db.chats.getById(id);
  await api.ensureChatAccess('write', chat)

  if (regenerate) {
    await db.chats.deleteMessagesAfter(id, message.id)
  }

  const { data: dbMessages } = await db.chats.getMessages(id, 10);
  const uiMessages = [...dbMessages, message];

  await db.chats.insertMessages(id, [message])

  const stream = createUIMessageStream<ChatMessage>({
    generateId: generateUUID,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: ai.chat,
        system: ai.prompts.chatPrompt.toString({ timeZone }),
        messages: convertToModelMessages(uiMessages),
        temperature: 0.2,
        maxOutputTokens: 800,
        tools: ai.createChatTools({ api, dataStream, chat: chat! }),
        stopWhen: stepCountIs(5),
        experimental_transform: smoothStream({ chunking: "word" }),
        onFinish: (res) => {
          // console.log(JSON.stringify(res.request, null, 2))
          console.log(res.totalUsage)
          dataStream.write({
            type: 'data-notification',
            data: { message: `Tokens used: ${res.totalUsage.totalTokens}`, level: 'info' },
            transient: true, // Won't be persisted to storage
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
      await db.chats.insertMessages(id, messages).catch((err) => {
        console.warn('Failed to save chat messages:', id, err);
      })
    },
    onError: (_err) => {
      return 'Oops, an error occurred!'
    },
  })

  return createUIMessageStreamResponse({ stream });
});
