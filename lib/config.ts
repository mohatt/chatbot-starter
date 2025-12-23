import type { AppConfig } from './types'

function getDeploymentBaseUrl() {
  const host = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL
  return host ? `https://${host}` : 'http://localhost:3000'
}

export const config = {
  appId: 'rag-chatbot',
  appName: 'Rag Chatbot',
  baseUrl: getDeploymentBaseUrl(),
  chat: {
    title: {
      fallback: 'New Chat',
      maxGeneratedLength: 40
    },
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

export type { AppConfig }
