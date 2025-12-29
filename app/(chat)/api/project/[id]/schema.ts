import { z } from 'zod'
import { AppError } from '@/lib/errors'

const postRequestBodySchema = z.object({
  name: z.string().trim().nonempty().max(100),
  prompt: z.string().trim().max(2000),
}).strict();

export type PostRequestBody = z.input<typeof postRequestBodySchema>

export const patchRequestBodySchema = postRequestBodySchema
  .partial()
  .refine((obj) => Object.keys(obj).length > 0)

export type PatchRequestBody = z.input<typeof patchRequestBodySchema>;

export function validatePostRequest(body: unknown) {
  const result = postRequestBodySchema.safeParse(body)
  if (!result.success) {
    throw new AppError('bad_request:project')
  }

  return result.data
}

export function validatePatchRequest(body: unknown) {
  const result = patchRequestBodySchema.safeParse(body)
  if (!result.success) {
    throw new AppError('bad_request:project')
  }

  return result.data
}
