import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules } from '@/lib/schema'

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'vercel' | 'huggingface';
  default?: boolean
}

export interface AppConfig {
  appId: string
  appName: string
  baseUrl: string
  chat: {
    title: {
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
    models: ModelConfig[]
  }
  project: {
    maxFiles: number
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
