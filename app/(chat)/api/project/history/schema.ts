import { z } from 'zod';
import { AppError } from '@/lib/errors'
import { uuidV7 } from '@/lib/schema'

export const getRequestBodySchema = z.object({
  cursor: uuidV7.optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .min(3)
    .max(5)
    .default(5),
  chatsLimit: z.coerce
    .number()
    .int()
    .positive()
    .min(5)
    .max(10)
    .default(5),
});

export function validateGetRequest(params: URLSearchParams) {
  const result = getRequestBodySchema.safeParse({
    cursor: params.get('cursor') || undefined,
    limit: params.get('limit') || undefined,
    chatsLimit: params.get('chatsLimit') || undefined,
  })
  if (!result.success) {
    throw new AppError('bad_request:project')
  }
  return result.data
}
