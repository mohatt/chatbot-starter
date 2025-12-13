import type { AppConfig } from './types'

export const config = {
  chat: {
    history: {
      defaultLimit: 100,
      maxLimit: 100
    }
  },
  fileLoader: {},
  project: {
    uploads: {
      files: {
        rules: {
          types: ['pdf', 'docx', 'txt', 'md', 'csv', 'html'],
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
