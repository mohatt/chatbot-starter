import { z } from 'zod';
import { AppError } from '@/lib/errors'
import { uuidV7 } from '@/lib/schema'
import { config } from '@/lib/config'

export const getRequestBodySchema = z.object({
  id: uuidV7,
  before: uuidV7.optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .min(10)
    .max(config.chat.history.maxLimit)
    .default(config.chat.history.defaultLimit),
});

export function validateGetRequest(id: unknown, params: URLSearchParams) {
  const result = getRequestBodySchema.safeParse({
    id,
    before: params.get('before') || undefined,
    limit: params.get('limit') || undefined,
  })
  if (!result.success) {
    throw new AppError('bad_request:chat')
  }
  return result.data
}
