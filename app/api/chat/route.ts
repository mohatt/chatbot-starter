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

    const { files } = session.metadata;
    const previousAssistant = historyReversed.find((msg) => msg.role === 'assistant');
    const queryEmbedding = files.length > 0 && await shouldUseRag(lastUserMessage.content, previousAssistant?.content);
    let augmentedHistory: ClientMessage[] = history;

    if (queryEmbedding !== false) {
      const relevantChunks = await searchSessionChunks(body.sessionId, queryEmbedding, 4);
      const sessionDescriptor = [
        `Session contains ${files.length} file${files.length === 1 ? '' : 's'}:`,
        ...files.map((file) => `- ${file.fileName} (Size: ${(file.size / 1024).toFixed(0)} KB) (Content Type: ${file.mimeType})`),
        'Note: multiple excerpts from the same file may appear below.'
      ].join('\n')

      const context = [
        sessionDescriptor,
        ...relevantChunks.map(({ metadata, content }) => {
          const source = `Excerpt from ${metadata.fileName}`;
          return [source, content.trim()].join('\n');
        })
      ].join('\n\n---\n\n');

      augmentedHistory = history.map((msg) =>
        msg === lastUserMessage
          ? {
            ...msg,
            content: `Context:\n${context}\n\n${msg.content}`
          }
          : msg
      );
    }

    const response = streamText({
      model: models.chat,
      system: `You are a friendly assistant! Keep your responses concise and helpful, without referencing chunk numbers or artificial sections. Use grounded facts from the provided document context. Respond in Markdown format if needed.`,
      messages: augmentedHistory,
      temperature: 0.2,
      maxOutputTokens: 600
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
