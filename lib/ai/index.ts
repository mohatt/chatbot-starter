import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany, type ToolSet } from 'ai'
import { fetchModels, getModelMeta, type ProvidersCatalog } from 'tokenlens'
import { config } from '@/lib/config'
import { listFiles, readFile, readFileText, fileTextSearch } from './tools'
import { chatPrompt, projectChatPrompt, chatTitlePrompt } from './prompts'
import type { Env } from '@/lib/env';
import type { ChatToolContext } from './types'
import type { ModelEntry } from './model-config'

export type LanguageModel = ReturnType<typeof gateway>
export type EmbeddingModel = ReturnType<typeof gateway['embeddingModel']>

export class AI {
  readonly chat: LanguageModel
  readonly defaultChatModel: ModelEntry
  readonly embedding: EmbeddingModel
  readonly prompts = {
    chatPrompt,
    chatTitlePrompt,
    projectChatPrompt,
  }
  private catalog?: ProvidersCatalog

  constructor(private env: Pick<Env, 'HUGGING_FACE_API_KEY' | 'VERCEL_OIDC_TOKEN'>) {
    this.defaultChatModel = config.chat.models.getDefault()
    this.chat = this.getLanguageModel(this.defaultChatModel)
    this.embedding = gateway.embeddingModel('openai/text-embedding-3-small');
  }

  getLanguageModel(entry: ModelEntry) {
    const { id, provider } = entry
    if (provider === 'huggingface') {
      const apiKey = this.env.HUGGING_FACE_API_KEY
      if (!apiKey) {
        throw new Error('No API key was found for HuggingFace')
      }
      return createHuggingFace({ apiKey })(id)
    }
    return gateway(id)
  }

  async getModelsCatalog() {
    if (this.catalog === undefined) {
      this.catalog = await fetchModels()
    }
    return this.catalog
  }

  async getModelMeta(model: LanguageModel | EmbeddingModel) {
    const providers = await this.getModelsCatalog()
    if (model.provider === 'huggingface.responses') {
      return getModelMeta(providers, 'huggingface', model.modelId)
    }
    return getModelMeta(providers, 'vercel', model.modelId)
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
      ...readFile(context),
      ...readFileText(context),
      ...fileTextSearch(context),
      // webSearch: gateway.tools.perplexitySearch(),
    } satisfies ToolSet
  }
}

export * from './types'
export * from './prompts'
