import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import type { ToolSet } from 'ai'
import type { ChatToolContext } from '../types'

export function webSearch({ model }: ChatToolContext) {
  const { key, vendor } = model
  if (!key.modifiers.webSearch) {
    return null
  }

  function googleSearch() {
    return {
      // Tool name must be 'google_search'
      google_search: google.tools.googleSearch({}),
    } satisfies ToolSet
  }

  function openaiSearch() {
    return {
      openai_web_search: openai.tools.webSearch(),
    } satisfies ToolSet
  }

  function anthropicSearch() {
    return {
      anthropic_web_search: anthropic.tools.webSearch_20250305({
        maxUses: 2,
      }),
    } satisfies ToolSet
  }

  const tools = {
    ...(vendor === 'google' ? googleSearch() : {}),
    ...(vendor === 'openai' ? openaiSearch() : {}),
    ...(vendor === 'anthropic' ? anthropicSearch() : {}),
  }
  if (!Object.keys(tools).length) {
    throw new Error('Selected chat model does not support web search.')
  }
  return tools
}
