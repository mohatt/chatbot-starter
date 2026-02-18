import type { AppConfig } from './types'
import { ModelsConfig } from '@/lib/ai/config'

function getDeploymentBaseUrl() {
  const host = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL
  console.log(process.env)
  throw new Error('Deployment URL is not set')
  return host ? `https://${host}` : 'http://localhost:3000'
}

export const config = {
  appId: 'chatbot-starter',
  appName: 'Chatbot Starter',
  appDescription: 'Full‑stack AI chatbot starter kit.',
  baseUrl: getDeploymentBaseUrl(),
  chat: {
    models: new ModelsConfig([
      // Anthropic
      {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'vercel',
        webSearch: true,
        thinking: true,
        default: true,
      },
      {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'vercel',
        webSearch: true,
        thinking: true,
      },
      {
        id: 'anthropic/claude-opus-4.5',
        name: 'Claude Opus 4.5',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
      {
        id: 'anthropic/claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
      // OpenAI
      {
        id: 'openai/gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        provider: 'vercel',
        webSearch: true,
      },
      {
        id: 'openai/gpt-5.2',
        name: 'GPT-5.2',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
      // Google
      {
        id: 'google/gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
      {
        id: 'google/gemini-3-flash',
        name: 'Gemini 3 Flash',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
      {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        provider: 'vercel',
        thinking: true,
        webSearch: true,
      },
    ]),
    title: {
      model: {
        id: 'openai/gpt-4.1-nano',
        provider: 'vercel',
        modifiers: {},
      },
      fallback: 'New Chat',
      maxGeneratedLength: 40,
    },
    message: {
      maxParts: 10,
      maxFileParts: 3,
    },
    history: {
      defaultLimit: 100,
      maxLimit: 100,
    },
  },
  project: {
    maxFiles: 12,
  },
  billing: {
    tiers: {
      user: {
        maxChatUsage: 2,
      },
      anonymous: {
        maxChatUsage: 1,
      },
    },
  },
  fileLoader: {},
  uploads: {
    images: {
      rules: {
        extensions: ['png', 'jpg', 'webp', 'gif'],
        maxSize: 5 * 1024 * 1024,
      },
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
  ],
} satisfies AppConfig

export type { AppConfig }
