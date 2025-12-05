import type { FileLoaderOptions, FileLoaderType } from '@/lib/document'
import type { FileUploadRules, UrlUploadOptions } from '@/lib/upload'

export interface AppConfig {
  fileLoader: FileLoaderOptions
  context: {
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
