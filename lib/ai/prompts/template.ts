import type { UIMessage } from 'ai'
import { generateUUID } from '@/lib/util'

type FormatArgs<Params extends Record<string, any>> = [Params] extends [never]
  ? []
  : [keyof Params] extends [never]
    ? []
    : {} extends Params
      ? [params?: Params]
      : [params: Params]

export interface PromptTemplateOptions<Input extends Record<string, any> = {}> {
  readonly template: string
  readonly format?: (input: Input) => Record<string, any>
  readonly as?: UIMessage['role']
}

export class PromptTemplate<Input extends Record<string, any> = {}> {
  constructor(private readonly options: PromptTemplateOptions<Input>) {}

  toString(...args: FormatArgs<Input>): string {
    const { template, format } = this.options
    if (!template) {
      return template
    }

    const input = args[0]
    const params = format?.(input ?? {} as Input) ?? input ?? {}

    // Parse if blocks e.g. {% if name %}Hi {{ name }}!{% endif %}
    const withConditionals = template.replace(
      /\{%\s*if\s+([\w:.-]+)\s*%\}\n?([\s\S]*?)\{%\s*endif\s*%\}\n?/g,
      (_block, key: string, content: string) => {
        const value = params[key]
        return value != null && value !== '' && value !== false ? content : ''
      }
    )

    // Parse template vars e.g. {{ name }}
    return withConditionals.replace(/\{\{\s*([\w:.-]+)\s*\}\}/g, (placeholder, key) => {
      const value = params[key]
      if (value !== undefined) {
        return `${value}`
      }
      return placeholder
    })
  }

  toUIMessage(...args: FormatArgs<Input>): UIMessage {
    return {
      id: generateUUID(),
      role: this.options.as ?? 'system',
      parts: [{ type: 'text', text: this.toString(...args) }]
    }
  }
}
