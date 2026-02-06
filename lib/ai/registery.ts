import { fetchModels, getModelMeta, type ProvidersCatalog, type ProviderModel } from 'tokenlens'
import { getTokenCosts } from 'tokenlens/helpers'
import type { LanguageModelUsage } from 'ai'
import type { ModelKey } from './config'

export interface ModelUsageSchema {
  input?: number
  output?: number
  reasoning?: number
  cacheReads?: number
  cacheWrites?: number
  total?: number
}

export interface ModelUsage {
  cost: ModelUsageSchema
  tokens: ModelUsageSchema
}

export interface ModelMeta extends ProviderModel {}

export class ModelsRegistry {
  private static instance?: ModelsRegistry

  static async getInstance() {
    if (!this.instance) {
      this.instance = new ModelsRegistry(await fetchModels())
    }
    return this.instance
  }

  constructor(readonly catalog: ProvidersCatalog) {}

  getModelMeta(key: Pick<ModelKey, 'id' | 'provider'>): ModelMeta {
    const { id, provider } = key
    const meta = getModelMeta({
      providers: this.catalog,
      provider,
      id,
    })
    if (!meta) {
      throw new Error(`Model ${id} is not supported`)
    }
    return meta
  }

  getModelUsage(key: Pick<ModelKey, 'id' | 'provider'>, usage: LanguageModelUsage): ModelUsage {
    const { id, provider } = key
    if (!this.catalog[provider]) {
      throw new Error(`Provider ${provider} is not supported`)
    }
    const cost = getTokenCosts({
      providers: this.catalog[provider],
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
}

export function createModelsRegistry() {
  return ModelsRegistry.getInstance()
}
