import { z } from 'zod'

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'vercel' | 'huggingface';
  thinking?: boolean | 'always';
  webSearch?: boolean;
  default?: true | ModelKeyModifiers
}

export type ModelKeyModifier = 'thinking' | 'websearch'
export type ModelKeyModifiers = {
  [K in ModelKeyModifier]?: boolean
}

export interface ModelKey {
  key: string
  entry: ModelEntry
  modifiers: ModelKeyModifiers
}

export interface ModelEntry extends ModelConfig {
  vendor?: string
  getKey: (modifiers?: ModelKeyModifiers, strict?: boolean) => string
}

export class ModelsConfig {
  readonly registry: readonly ModelEntry[]

  constructor(config: ModelConfig[]) {
    this.registry = config.map(entry => {
      const { id, provider, thinking, webSearch } = entry
      const parts = id.split('/')
      return {
        ...entry,
        vendor: parts.length > 1 && parts[0] || undefined,
        getKey: (modifiers, strict) => {
          const modifiersArr = [] as ModelKeyModifier[]
          if (modifiers?.thinking || thinking === 'always') {
            if(thinking) {
              modifiersArr.push('thinking')
            } else if (strict) {
              throw new Error(`Model ${id} does not support reasoning`)
            }
          }
          if (modifiers?.websearch) {
            if(webSearch) {
              modifiersArr.push('websearch')
            } else if (strict) {
              throw new Error(`Model ${id} does not support web search`)
            }
          }
          return [provider, id, ...modifiersArr].join(':')
        },
      }
    })
  }

  getDefault(): ModelKey {
    const entry = this.registry.find(m => m.default)
    if (!entry) {
      throw new Error('No default model was found')
    }
    const modifiers = typeof entry.default === 'object' ? entry.default : {}
    const key = entry.getKey(modifiers, true)
    return { key, entry, modifiers }
  }

  parseKey(key: string): ModelKey {
    const [provider, modelId, ...rest] = key.split(':')
    const modifiersArr = rest as ModelKeyModifier[]
    if (!provider || !modelId || modifiersArr.some((m) => !['thinking', 'websearch'].includes(m))) {
      throw new Error(`Invalid model key: ${key}`)
    }
    const entry = this.registry.find((m) => m.provider === provider && m.id === modelId)
    const modifiers = Object.fromEntries(modifiersArr.map(k => [k, true])) as ModelKeyModifiers
    if (!entry
      || (modifiers.thinking && !entry.thinking)
      || (!modifiers.thinking && entry.thinking === 'always')
      || (modifiers.websearch && !entry.webSearch)
    ) {
      throw new Error(`Invalid model key: ${key}`)
    }
    return { key, entry, modifiers }
  }

  getKeySchema() {
    return z
      .string()
      .nonempty()
      .transform((val, ctx) => {
        try {
          return this.parseKey(val)
        } catch (err) {
          ctx.addIssue({
            code: 'custom',
            input: val,
            message: (err as Error).message,
          })
        }
        return z.NEVER
      })
  }
}
