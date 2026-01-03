import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules } from '@/lib/schema'

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
  }
  fileLoader: FileLoaderOptions
  project: {
    uploads: {
      images: {
        rules: FileUploadRules<'png' | 'jpg' | 'webp'>
      }
      files: {
        rules: FileUploadRules<FileLoaderType>
      }
    }
  }
}
