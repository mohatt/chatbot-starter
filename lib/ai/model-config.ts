import { z } from 'zod'

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'vercel' | 'huggingface';
  thinking?: boolean | 'always';
  default?: boolean
}

export interface ModelEntry extends ModelConfig {
  vendor?: string
}

export class ModelsConfig {
  readonly registry: readonly ModelEntry[]

  constructor(config: ModelConfig[]) {
    this.registry = config.map(m => {
      const parts = m.id.split('/')
      return {
        ...m,
        vendor: parts.length > 1 && parts[0] || undefined,
      }
    })
  }

  getDefault() {
    const def = this.registry.find(m => m.default) ?? this.registry[0]
    if (!def) {
      throw new Error('No default model was found')
    }
    return def
  }

  resolve(key: string) {
    const [provider, modelId, variant] = key.split(':')
    if (!provider || !modelId || (variant !== undefined && variant !== 'thinking')) {
      throw new Error(`Invalid model key: ${key}`)
    }
    const isThinking = variant === 'thinking'

    const entry = this.registry.find((m) => m.provider === provider && m.id === modelId)
    if (!entry || (isThinking && !entry.thinking) || (!isThinking && entry.thinking === 'always')) {
      throw new Error(`Invalid model key: ${key}`)
    }
    return { key, entry, variant } as const
  }

  serialize(model: ModelConfig, variant?: 'thinking') {
    const { id, provider, thinking } = model
    const isThinking = variant === 'thinking' || thinking === 'always'
    if (isThinking && !thinking) {
      throw new Error(`Model ${id} does not support reasoning`)
    }
    return `${provider}:${id}${isThinking ? ':thinking' : ''}`
  }

  getKeySchema() {
    return z
      .string()
      .nonempty()
      .transform((val, ctx) => {
        try {
          return this.resolve(val)
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
