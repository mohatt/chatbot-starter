import { z } from 'zod'

const modelKeySchema = z.object({
  id: z.string().nonempty(),
  provider: z.enum(['vercel', 'huggingface']),
  modifiers: z.object({
    thinking: z.boolean().optional(),
    webSearch: z.boolean().optional(),
  }),
})

export type ModelKey = z.infer<typeof modelKeySchema>

export interface ModelConfig extends Pick<ModelKey, 'id' | 'provider'> {
  name: string
  thinking?: boolean | 'always'
  webSearch?: boolean
  default?: true | ModelKey['modifiers']
}

export interface ModelEntry extends ModelConfig {
  vendor?: string
}

export interface ResolvedModelEntry extends ModelEntry {
  key: ModelKey
}

export class ModelsConfig {
  readonly registry: readonly ModelEntry[]

  constructor(config: ModelConfig[]) {
    this.registry = config.map((entry) => {
      const parts = entry.id.split('/')
      return {
        ...entry,
        vendor: (parts.length > 1 && parts[0]) || undefined,
      }
    })
  }

  getDefault(): ModelKey {
    const entry = this.registry.find((m) => m.default)
    if (!entry) {
      throw new Error('No default model was found')
    }
    const modifiers = typeof entry.default === 'object' ? entry.default : {}
    return this.getKey(entry, modifiers)
  }

  getKey(
    entry: ModelEntry | ResolvedModelEntry,
    modifiers?: ModelKey['modifiers'],
    strict?: boolean,
  ): ModelKey {
    const { id, provider, thinking, webSearch } = entry
    const key: ModelKey = {
      id,
      provider,
      modifiers: {},
    }
    const mods = 'key' in entry ? { ...entry.key.modifiers, ...modifiers } : modifiers
    if (mods?.thinking || thinking === 'always') {
      if (thinking) {
        key.modifiers.thinking = true
      } else if (strict) {
        throw new Error(`Model ${id} does not support reasoning`)
      }
    }
    if (mods?.webSearch) {
      if (webSearch) {
        key.modifiers.webSearch = true
      } else if (strict) {
        throw new Error(`Model ${id} does not support web search`)
      }
    }
    return key
  }

  resolveKey(key: ModelKey): ResolvedModelEntry {
    const { id, provider, modifiers } = key
    const entry = this.registry.find((m) => m.provider === provider && m.id === id)
    if (
      !entry ||
      (modifiers.thinking && !entry.thinking) ||
      (!modifiers.thinking && entry.thinking === 'always') ||
      (modifiers.webSearch && !entry.webSearch)
    ) {
      throw new Error(`Invalid model key for ${id}`)
    }
    return { ...entry, key }
  }

  getKeySchema() {
    return modelKeySchema
      .default(() => this.getDefault())
      .transform((val, ctx) => {
        try {
          return this.resolveKey(val)
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
