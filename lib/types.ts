import type { ModelsConfig, ModelKey } from '@/lib/ai/config'
import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules } from '@/lib/schema'
import type { BillingTierMap } from '@/lib/billing'

export interface AppConfig {
  appId: string
  appName: string
  appDescription: string
  baseUrl: string
  chat: {
    title: {
      model: ModelKey
      fallback: string
      maxGeneratedLength: number
    }
    message: {
      maxParts: number
    }
    history: {
      defaultLimit: number
      maxLimit: number
    }
    models: ModelsConfig
  }
  sidebar: {
    defaultOpen: boolean
  }
  billing: {
    tierMap: BillingTierMap
  }
  fileLoader: FileLoaderOptions
  uploads: {
    images: {
      rules: FileUploadRules<'png' | 'jpg' | 'webp' | 'gif'>
      placeholder: string
    }
    retrieval: {
      rules: FileUploadRules<FileLoaderType>
    }
  }
  retryStatusCodes: number[]
}
