import { z } from 'zod'
import { uuidV7 } from '@/lib/schema'

export const getRequestBodySchema = z.object({
  cursor: uuidV7.optional(),
  limit: z.coerce.number().int().positive().min(3).max(5).default(5),
})

export type GetRequestBody = z.input<typeof getRequestBodySchema>
