import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany, type ToolSet } from 'ai'
import type { Env } from '@/lib/env';
import type { ChatToolContext } from './types'
import { listFiles, queryFileContents } from './tools'
import { chatPrompt, chatTitlePrompt } from './prompts'

const defaults = {
  gateway: {
    chat: 'openai/gpt-4o-mini',
    // chat: 'meta/llama-3.1-8b', // good low-cost model with tool support
    // chat: 'meituan/longcat-flash-chat', // very good free model but latency is high
    embedding: 'openai/text-embedding-3-small',
  },
  hf: {
    chat: 'meta-llama/Llama-3.1-8B-Instruct'
  }
} as const

export class AI {
  readonly chat: ReturnType<typeof gateway>;
  readonly embedding: ReturnType<typeof gateway['textEmbeddingModel']>;
  readonly prompts = { chatPrompt, chatTitlePrompt }

  constructor(env: Pick<Env, 'HUGGING_FACE_API_KEY' | 'AI_MODEL' | 'EMBEDDING_MODEL'>) {
    const {
      HUGGING_FACE_API_KEY,
      AI_MODEL,
      EMBEDDING_MODEL,
    } = env;

    this.chat = HUGGING_FACE_API_KEY
      ? createHuggingFace({ apiKey: HUGGING_FACE_API_KEY })(AI_MODEL ?? defaults.hf.chat)
      : gateway(AI_MODEL ?? defaults.gateway.chat)

    this.embedding = gateway.textEmbeddingModel(EMBEDDING_MODEL ?? defaults.gateway.embedding);
  }

  async embed(value: string): Promise<number[]> {
    const result = await embed({
      model: this.embedding, value,
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embedding
  }

  async embedMany(values: string[]): Promise<number[][]> {
    const result = await embedMany({
      model: this.embedding,
      values,
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embeddings
  }

  createChatTools(context: ChatToolContext) {
    return {
      ...listFiles(context),
      ...queryFileContents(context),
    } satisfies ToolSet
  }
}

export * from './types'
export * from './prompts'
