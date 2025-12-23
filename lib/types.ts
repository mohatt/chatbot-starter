import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules, UrlUploadOptions } from '@/lib/upload'

export interface AppConfig {
  appId: string
  appName: string
  baseUrl: string
  chat: {
    title: {
      fallback: string,
      maxGeneratedLength: number
    }
    history: {
      defaultLimit: number
      maxLimit: number
    }
  }
  fileLoader: FileLoaderOptions
  project: {
    uploads: {
      files: {
        rules: FileUploadRules<FileLoaderType>
      }
      urls: {
        rules: FileUploadRules<FileLoaderType>
        options?: UrlUploadOptions
      }
    }
  }
}
