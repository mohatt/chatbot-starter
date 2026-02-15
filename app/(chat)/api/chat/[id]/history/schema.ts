import { z } from 'zod'
import { config } from '@/lib/config'
import { uuidV7 } from '@/lib/schema'

export const getRequestBodySchema = z.object({
  before: uuidV7.optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .min(10)
    .max(config.chat.history.maxLimit)
    .default(config.chat.history.defaultLimit),
})

export type GetRequestBody = z.input<typeof getRequestBodySchema>
