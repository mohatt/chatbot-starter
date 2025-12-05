import type { UIMessage } from 'ai'
import type { ZodObject, TypeOf } from 'zod'
import { generateUUID } from '@/lib/util'

type FormatArgs<Params extends Record<string, any>> = [Params] extends [never]
  ? []
  : [keyof Params] extends [never]
    ? []
    : {} extends Params
      ? [params?: Params]
      : [params: Params]

export interface PromptTemplateOptions<Schema extends ZodObject<any> = ZodObject<any>, Params extends Record<string, any> = TypeOf<Schema>> {
  readonly template: string
  readonly schema?: Schema
  readonly format?: (input: Params) => Params & { [p: string]: any }
  readonly as?: UIMessage['role']
}

export class PromptTemplate<Schema extends ZodObject<any> = ZodObject<any>, Params extends Record<string, any> = TypeOf<Schema>> {
  declare readonly $inferInput: FormatArgs<Params>[0]

  constructor(private readonly options: PromptTemplateOptions<Schema, Params>) {}

  toString(...args: FormatArgs<Params>): string {
    const { template, schema, format } = this.options
    if (!template) {
      return template
    }

    const input = args[0]
    const validated = schema?.parse(input) as Params ?? input
    const params = format?.(validated ?? {} as Params) ?? validated
    if (!params) {
      return template
    }

    return template.replace(/\{([\w:.-]+)}/g, (placeholder, key): string => {
      const value = params[key as keyof Params]
      if (value !== undefined) {
        return `${value}`
      }
      return placeholder
    })
  }

  toUIMessage(...args: FormatArgs<Params>): UIMessage {
    return {
      id: generateUUID(),
      role: this.options.as ?? 'system',
      parts: [{ type: 'text', text: this.toString(...args) }]
    }
  }
}
