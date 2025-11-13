import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { streamText, type UIMessage  } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { createEmbeddings } from '../../../lib/embeddings';
import { ensureSchema, getSessionMetadata, searchSessionChunks } from '../../../lib/db';
import { env, defaults, assertEnv } from '../../../lib/env';

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

const BASE_PROMPT = `You are a meticulous research assistant. Answer naturally, without referencing chunk numbers or artificial sections. Only use grounded facts from the provided document context; if it is missing, say the file does not contain the requested information. Respond to the user in Markdown format.`;

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
    const embeddings = createEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(lastUserMessage.content);
    const relevantChunks = await searchSessionChunks(body.sessionId, queryEmbedding, 4);
    const context =
      relevantChunks
        .map((chunk) => chunk.content.trim())
        .filter(Boolean)
        .join('\n\n---\n\n');

    const includeContext = !!context && shouldAttachContext(lastUserMessage.content);
    const augmentedHistory = includeContext
      ? history.map((msg) =>
          msg === lastUserMessage
            ? {
                ...msg,
                content: `Document context:\n${context}\n\n${msg.content}`
              }
            : msg
        )
      : history;

    if (env.HF_ACCESS_TOKEN && defaults.chatModel.toLowerCase().includes('llama')) {
      const apiKey = assertEnv(env.HF_ACCESS_TOKEN, 'HF_ACCESS_TOKEN');
      const huggingFace = createHuggingFace({ apiKey });
      const response = streamText({
        model: huggingFace(defaults.chatModel),
        system: BASE_PROMPT,
        messages: augmentedHistory,
        temperature: 0.2,
        maxOutputTokens: 600
      });
      return response.toUIMessageStreamResponse();
    }

    const apiKey = assertEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY');
    const openai = createOpenAI({ apiKey, baseURL: env.OPENAI_BASE_URL });
    const response = streamText({
      model: openai(defaults.chatModel),
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
