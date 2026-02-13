import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany } from 'ai'
import type { Env } from '@/lib/env';
import type { ModelKey } from './config'
import type { LanguageModel, EmbeddingModel } from './types'

export class AI {
  readonly embedding: EmbeddingModel

  constructor(private env: Pick<Env, 'HUGGING_FACE_API_KEY' | 'VERCEL_OIDC_TOKEN'>) {
    this.embedding = gateway.embeddingModel('openai/text-embedding-3-small');
  }

  getLanguageModel(key: ModelKey): LanguageModel {
    const { id, provider } = key
    if (provider === 'huggingface') {
      const apiKey = this.env.HUGGING_FACE_API_KEY
      if (!apiKey) {
        throw new Error('No API key was found for HuggingFace')
      }

      return createHuggingFace({ apiKey })(id)
    }

    return gateway(id)
  }

  async embed(value: string): Promise<number[]> {
    const result = await embed({
      value,
      model: this.embedding,
      // dimensions: 1024 for Upstash Vector
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embedding
  }

  async embedMany(values: string[]): Promise<number[][]> {
    const result = await embedMany({
      values,
      model: this.embedding,
      // dimensions: 1024 for Upstash Vector
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embeddings
  }
}

export * from './types'
export * from './config'
export * from './registery'
export * from './context'
export * from './options'
export * from './prompts'
export {
  createChatTools,
  createFileToolModelOutput,
  type ChatTools,
  type ChatToolSet,
} from './tools'
