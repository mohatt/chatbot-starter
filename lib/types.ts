import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules, UrlUploadOptions } from '@/lib/upload'

export interface AppConfig {
  appId: string
  appName: string
  chat: {
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
