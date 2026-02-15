import { z } from 'zod'

export const postRequestBodySchema = z
  .object({
    name: z.string().trim().nonempty().max(100),
    prompt: z.string().trim().max(2000),
  })
  .strict()

export type PostRequestBody = z.input<typeof postRequestBodySchema>

export const patchRequestBodySchema = postRequestBodySchema
  .partial()
  .refine((obj) => Object.keys(obj).length > 0)

export type PatchRequestBody = z.input<typeof patchRequestBodySchema>
