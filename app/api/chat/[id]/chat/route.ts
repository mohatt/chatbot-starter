import { type NextRequest } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage, type ModelMessage } from 'ai'
import { db } from '@/lib/db'
import { models } from '@/lib/ai';
import { AppError } from '@/lib/errors'
import { shouldUseRag } from '@/lib/rag-intent';
import { vectorDb } from '@/lib/db/vector'

export const runtime = 'nodejs';

type ChatMessage = UIMessage<{}>;

interface ChatRequestBody {
  messages?: ChatMessage[];
}

const BASE_PROMPT = `You are a friendly conversational assistant working with user-provided files. Respond in Markdown format if needed.
You MUST follow these rules when responding to user messages:

1. Use the provided context and/or chat history.
   - Each excerpt provided in the context belongs to exactly one file, identified by its index number (eg. #1) as it appeared in the file content.
   - Keep your responses concise and helpful WITHOUT referencing excerpt index numbers.
   - Match the user’s tone: if they are casual, be casual; if they are formal, be formal.

2. Treat each file as completely independent.
   - Files are NOT related unless explicitly stated by the user.
   - Do NOT combine information from different files under any circumstance.

3. When answering a question about a specific file:
   - Use ONLY excerpts from that file.
   - Ignore all excerpts belonging to other files.
   - Never import names, dates, companies, or facts from another file.
`

export function getTextFromMessage(message: ModelMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export async function POST(request: NextRequest, ctx: RouteContext<'/api/chat/[id]/chat'>) {
  try {
    const { id } = await ctx.params;
    const body: ChatRequestBody = await request.json();
    const chat = await db.chats.getById(id);
    if (!chat) {
      throw new AppError('not_found:chat')
    }

    const history = convertToModelMessages(body.messages)
    const historyReversed = [...history].reverse();
    const lastUserMessage = historyReversed.find((msg) => msg.role === 'user');
    if (!lastUserMessage) {
      throw new AppError('bad_request:chat', 'User message is required.')
    }

    const { files, vectors } = chat.context;
    const previousAssistant = historyReversed.find((msg) => msg.role === 'assistant');
    const queryEmbedding = vectors > 0 && await shouldUseRag(getTextFromMessage(lastUserMessage), previousAssistant && getTextFromMessage(previousAssistant));
    let context = '';

    if (queryEmbedding !== false) {
      const relevantChunks = await vectorDb.content.similaritySearchWithScore(queryEmbedding, 6, `chatId = '${chat.id}'`);
      context = relevantChunks.map(([{ metadata, pageContent }]) => {
        const source = `Excerpt #${metadata.index + 1} from ${metadata.fileName}`;
        return [source, pageContent.trim()].join('\n');
      }).join('\n\n---\n\n');
    }

    const sessionDescriptor = [
      `This session can access ${files.length} file${files.length === 1 ? '' : 's'}:\n`,
      ...files.map((file) => [
        `- ${file.name}`,
        `  Content Type: ${file.type}`,
        `  Size: ${(file.size / 1024).toFixed(0)} KB`,
      ]),
    ].join('\n')

    const response = streamText({
      model: models.chat,
      system: [BASE_PROMPT, sessionDescriptor].join('\n\n'),
      messages: context ? [...history, { role: 'system', content: `Context:\n${context}` }] : history,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    return response.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    return new AppError('internal:chat', error as Error).toResponse()
  }
}
