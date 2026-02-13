import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { XaiProviderOptions } from '@ai-sdk/xai'
import type { ChatContext } from './context'

export function createChatOptions({ model, modelMeta }: ChatContext): Record<string, any> {
  const { vendor, id } = model
  const isReasoning = model.key.modifiers.thinking === true

  if(vendor === 'google') {
    const v2_5 = id.startsWith('google/gemini-2.5')
    const v3 = id.startsWith('google/gemini-3')
    return {
      google: {
        // https://ai.google.dev/gemini-api/docs/thinking#javascript
        thinkingConfig: {
          includeThoughts: isReasoning,
          ...(v3 ? {
            // For reasoning let the model decide how much thinking to use (dynamic)
            thinkingLevel: isReasoning ? undefined : 'low'
          } : v2_5 ? {
            thinkingBudget: isReasoning ? undefined : 1024
          } : {}),
        },
      } satisfies GoogleGenerativeAIProviderOptions
    }
  }

  if(vendor === 'anthropic') {
    return {
      anthropic: {
        // https://platform.claude.com/docs/en/build-with-claude/extended-thinking
        thinking: isReasoning
          ? { type: "enabled", budgetTokens: 10_240 }
          : undefined,
      } satisfies AnthropicProviderOptions
    }
  }

  if(vendor === 'openai') {
    return {
      openai: {
        reasoningEffort: isReasoning ? 'medium' : (modelMeta.reasoning ? 'low' : undefined),
        reasoningSummary: isReasoning ? 'auto' : undefined
      } satisfies OpenAIResponsesProviderOptions,
    }
  }

  if (vendor === 'xai') {
    return {
      xai: {
        parallel_function_calling: false,
      } satisfies XaiProviderOptions,
    }
  }

  return {}
}
