import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany, type LanguageModelUsage } from 'ai'
import { fetchModels, getModelMeta, type ProvidersCatalog } from 'tokenlens'
import { getTokenCosts } from 'tokenlens/helpers'
import type { Env } from '@/lib/env';
import type { ModelKey } from './config'
import type { LanguageModel, EmbeddingModel, ModelUsage } from './types'

export class AI {
  readonly embedding: EmbeddingModel
  private catalog?: ProvidersCatalog

  constructor(private env: Pick<Env, 'HUGGING_FACE_API_KEY' | 'VERCEL_OIDC_TOKEN'>) {
    this.embedding = gateway.embeddingModel('openai/text-embedding-3-small');
  }

  async getLanguageModel(key: ModelKey): Promise<LanguageModel> {
    const { id, provider } = key
    const meta = await this.getModelMeta(key)
    if (key.modifiers.thinking && !meta.reasoning) {
      throw new Error(`Model ${id} does not support reasoning.`)
    }

    if (provider === 'huggingface') {
      const apiKey = this.env.HUGGING_FACE_API_KEY
      if (!apiKey) {
        throw new Error('No API key was found for HuggingFace')
      }

      return createHuggingFace({ apiKey })(id)
    }

    return gateway(id)
  }

  async getProvidersCatalog() {
    if (this.catalog === undefined) {
      this.catalog = await fetchModels()
    }
    return this.catalog
  }

  async getModelUsage(key: ModelKey, usage: LanguageModelUsage): Promise<ModelUsage> {
    const { id, provider } = key
    const providers = await this.getProvidersCatalog()
    if (!providers[provider]) {
      throw new Error(`Provider ${provider} is not supported`)
    }
    const cost = getTokenCosts({
      providers: providers[provider],
      modelId: id,
      usage: {
        ...usage,
        // tokenlens does not read cacheWriteTokens from inputTokenDetails
        cacheWrites: usage.inputTokenDetails.cacheWriteTokens,
      },
    })
    if (!cost) {
      throw new Error(`Unable to calculate usage for model ${id}`);
    }
    return {
      tokens: {
        input: usage.inputTokens,
        output: usage.outputTokens,
        reasoning: usage.outputTokenDetails.reasoningTokens,
        cacheReads: usage.inputTokenDetails.cacheReadTokens,
        cacheWrites: usage.inputTokenDetails.cacheWriteTokens,
        total: usage.totalTokens,
      },
      cost: {
        input: cost.inputUSD,
        output: cost.outputUSD,
        reasoning: cost.reasoningUSD,
        cacheReads: cost.cacheReadsUSD,
        cacheWrites: cost.cacheWritesUSD,
        total: cost.totalUSD,
      },
    }
  }

  async getModelMeta(key: ModelKey) {
    const { id, provider } = key
    const providers = await this.getProvidersCatalog()
    const meta = getModelMeta({ providers, provider, id })
    if (!meta) {
      throw new Error(`Model ${id} is not supported`)
    }
    return meta
  }

  async embed(value: string): Promise<number[]> {
    const result = await embed({
      value,
      model: this.embedding,
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embedding
  }

  async embedMany(values: string[]): Promise<number[][]> {
    const result = await embedMany({
      values,
      model: this.embedding,
      providerOptions: { openai: { dimensions: 1024 } },
    })
    return result.embeddings
  }
}

export * from './types'
export * from './config'
export * from './context'
export * from './options'
export * from './prompts'
export {
  createChatTools,
  type ChatTools,
  type ChatToolSet,
} from './tools'
