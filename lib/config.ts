import type { AppConfig } from './types'

export const config = {
  chat: {
    history: {
      limit: 10
    }
  },
  fileLoader: {},
  context: {
    uploads: {
      files: {
        rules: {
          types: ['pdf', 'docx', 'txt', 'md', 'csv', 'html'],
          min: 1,
          max: 10,
          maxSize: 8 * 1024 * 1024,
          maxTotalSize: 16 * 1024 * 1024,
        },
      },
      urls: {
        rules: {
          types: ['pdf', 'docx', 'txt', 'md', 'csv', 'html'],
          min: 0,
          max: 10,
          maxSize: 8 * 1024 * 1024,
          maxTotalSize: 16 * 1024 * 1024,
        },
        options: {
          fetch: {},
          asyncCaller: {
            maxRetries: 1
          }
        },
      }
    }
  },
} satisfies AppConfig
