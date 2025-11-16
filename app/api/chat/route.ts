import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { streamText, type UIMessage } from 'ai';
import { ensureSchema, getSessionMetadata, searchSessionChunks } from '@/lib/db';
import { models } from '@/lib/ai';
import { shouldUseRag } from '@/lib/rag-intent';

export const runtime = 'nodejs';

interface ChatRequestBody {
  sessionId?: string;
  messages?: UIMessage[];
}

interface ClientMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const BASE_PROMPT = `You are a friendly assistant working with user-provided files. Respond in Markdown format if needed.

You MUST follow these rules when responding to user messages:

1. Use grounded facts from the provided context.
   - Each excerpt provided in the context belongs to exactly one file, identified by its index number (eg. #1) as it appeared in the file content.
   - Keep your responses concise and helpful WITHOUT referencing excerpt index numbers.

2. Treat each file as completely independent.
   - Files are NOT related unless explicitly stated by the user.
   - Do NOT combine information from different files under any circumstance.

3. When answering a question about a specific file:
   - Use ONLY excerpts from that file.
   - Ignore all excerpts belonging to other files.
   - Never import names, dates, companies, or facts from another file.

4. If the context includes excerpts from multiple files but the user’s question does NOT specify which file:
   - Ask the user to clarify which file they mean.
   - Do NOT guess or mix information.
`

function extractFromParts(message: UIMessage) {
  return message.parts?.map((part) => {
    if (!part || typeof part !== 'object') return ''
    const maybeText = (part as { text?: unknown }).text
    return typeof maybeText === 'string' ? maybeText : ''
  })
    .filter(Boolean)
    .join('\n')
    .trim() ?? '';
}

function normalizeMessages(rawMessages: UIMessage[]): ClientMessage[] {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .map((candidate): ClientMessage | null => {
      if (!candidate || typeof candidate !== 'object') return null;
      if (candidate.role !== 'user' && candidate.role !== 'assistant') return null;
      const content = extractFromParts(candidate);
      if (!content) return null;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : randomUUID(),
        role: candidate.role,
        content
      }
    })
    .filter((msg) => Boolean(msg));
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body: ChatRequestBody = await request.json();
    if (!body.sessionId) {
      return NextResponse.json({ error: 'Missing sessionId. Upload a document first.' }, { status: 400 });
    }

    const session = await getSessionMetadata(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found. Please upload the document again.' }, { status: 404 });
    }

    const history = normalizeMessages(body.messages ?? []);
    const historyReversed = [...history].reverse();
    const lastUserMessage = historyReversed.find((msg) => msg.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'User message is required.' }, { status: 400 });
    }

    const { files, totalChunks } = session.metadata;
    const previousAssistant = historyReversed.find((msg) => msg.role === 'assistant');
    const queryEmbedding = totalChunks > 0 && await shouldUseRag(lastUserMessage.content, previousAssistant?.content);
    let context = 'None';

    if (queryEmbedding !== false) {
      const relevantChunks = await searchSessionChunks(body.sessionId, queryEmbedding, 6);
      context = relevantChunks.map(({ metadata, content, chunk_index }) => {
        const source = `Excerpt #${chunk_index + 1} from ${metadata.fileName}`;
        return [source, content.trim()].join('\n');
      }).join('\n\n---\n\n');
    }

    const sessionDescriptor = [
      `This session can access ${files.length} file${files.length === 1 ? '' : 's'}:\n`,
      ...files.map((file) => [
        `- ${file.fileName}`,
        `  Content Type: ${file.mimeType}`,
        `  Size: ${(file.size / 1024).toFixed(0)} KB`,
      ]),
    ].join('\n')

    const augmentedHistory = history.map((msg) =>
      msg === lastUserMessage
        ? {
          ...msg,
          content: `Context:\n${context}\n\nUser Query:\n${msg.content}`
        }
        : msg
    );

    const response = streamText({
      model: models.chat,
      system: [BASE_PROMPT, sessionDescriptor].join('\n\n'),
      messages: augmentedHistory,
      temperature: 0.2,
      maxOutputTokens: 800
    });

    return response.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat error', error);
    return NextResponse.json(
      { error: 'Chat request failed.', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
