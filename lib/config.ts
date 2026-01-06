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
  uploads: {
    images: {
      rules: {
        extensions: ['png', 'jpg', 'webp'],
        maxSize: 5 * 1024 * 1024,
      }
    },
    retrieval: {
      rules: {
        extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'html'],
        maxSize: 8 * 1024 * 1024,
      },
    },
  },
  retryStatusCodes: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]
} satisfies AppConfig

export type { AppConfig }
