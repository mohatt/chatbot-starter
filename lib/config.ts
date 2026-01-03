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
    message: {
      maxParts: 10,
      maxFileParts: 3,
    },
    history: {
      defaultLimit: 100,
      maxLimit: 100
    }
  },
  fileLoader: {},
  project: {
    uploads: {
      images: {
        rules: {
          types: ['png', 'jpg', 'webp'],
          maxSize: 5 * 1024 * 1024,
        }
      },
      files: {
        rules: {
          types: ['pdf', 'docx', 'txt', 'md', 'csv', 'html'],
          maxSize: 8 * 1024 * 1024,
        },
      },
    }
  },
} satisfies AppConfig

export type { AppConfig }
