import type { BillingPeriodRecord } from '@/lib/db'
import type { ModelsConfig, ModelKey } from '@/lib/ai/config'
import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules } from '@/lib/schema'

export interface AppConfig {
  appId: string
  appName: string
  baseUrl: string
  chat: {
    title: {
      model: ModelKey
      fallback: string,
      maxGeneratedLength: number
    }
    message: {
      maxParts: number
      maxFileParts: number
    }
    history: {
      defaultLimit: number
      maxLimit: number
    }
    models: ModelsConfig
  }
  project: {
    maxFiles: number
  }
  billing: {
    tiers: Record<BillingPeriodRecord['tier'], Pick<BillingPeriodRecord, 'maxChatUsage'>>
  }
  fileLoader: FileLoaderOptions
  uploads: {
    images: {
      rules: FileUploadRules<'png' | 'jpg' | 'webp' | 'gif'>
    }
    retrieval: {
      rules: FileUploadRules<FileLoaderType>
    }
  }
  retryStatusCodes: number[]
}
