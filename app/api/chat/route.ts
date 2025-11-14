import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { streamText, type UIMessage } from 'ai';
import { ensureSchema, getSessionMetadata, searchSessionChunks } from '@/lib/db';
import { createModels } from '@/lib/ai';

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

const BASE_PROMPT = `You are a friendly assistant! Keep your responses concise and helpful, without referencing chunk numbers or artificial sections. Use grounded facts from the provided document context. Respond in Markdown format if needed.`;

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

function shouldAttachContext(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return false;
  if (/(thanks|thank you|appreciate|cool|awesome|great|ok(ay)?|got it)/i.test(trimmed)) {
    return false;
  }
  if (/[?]/.test(trimmed)) return true;
  if (/\b(who|what|when|where|why|how|which|list|summarize|explain|describe|tell|show|give|extract|analyze)\b/i.test(trimmed)) {
    return true;
  }
  return trimmed.length > 30;
}

export async function POST(request: NextRequest) {
  try {
    const models = createModels();
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
    const lastUserMessage = [...history].reverse().find((msg) => msg.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'User message is required.' }, { status: 400 });
    }
    const queryEmbedding = await models.embedding.embedQuery(lastUserMessage.content);
    const relevantChunks = await searchSessionChunks(body.sessionId, queryEmbedding, 4);

    const { files } = session.metadata;
    const sessionDescriptor = files.length
      ? [
          `Session contains ${files.length} file${files.length === 1 ? '' : 's'}:`,
          ...files.map((file) => `- ${file.fileName} (${file.mimeType})`),
          'Note: multiple excerpts from the same file may appear below.'
        ].join('\n')
      : null;

    const contextSections = [
      sessionDescriptor,
      ...relevantChunks.map(({ metadata, content }) => {
        const source = `Excerpt from ${metadata.fileName}`;
        return [source, content].join('\n');
      })
    ].filter(Boolean);

    const context = contextSections.join('\n\n---\n\n');

    const includeContext = !!context && shouldAttachContext(lastUserMessage.content);
    const augmentedHistory = includeContext
      ? history.map((msg) =>
          msg === lastUserMessage
            ? {
                ...msg,
                content: `Context:\n${context}\n\n${msg.content}`
              }
            : msg
        )
      : history;

    const response = streamText({
      model: models.chat,
      system: BASE_PROMPT,
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
