import { z } from 'zod'
import { uuidV7 } from '@/lib/schema'

export const getRequestBodySchema = z.object({
  projectId: uuidV7.optional(),
  cursor: uuidV7.optional(),
  limit: z.coerce.number().int().positive().min(25).max(1000).optional(),
})

export type GetRequestBody = z.input<typeof getRequestBodySchema>

export const deleteRequestBodySchema = z.object({
  projectId: uuidV7.optional(),
})

export type DeleteRequestBody = z.input<typeof deleteRequestBodySchema>
