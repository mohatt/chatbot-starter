import { z } from 'zod';
import { AppError } from '@/lib/errors'
import { uuidV7, timeZone } from '@/lib/schema'

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().trim().nonempty().max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string().nonempty().max(32),
  name: z.string().trim().nonempty().max(128),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  message: z.object({
    id: uuidV7,
    role: z.enum(["user"]),
    parts: z.array(partSchema).nonempty().max(10),
  }),
  timeZone,
  regenerate: z.boolean().default(false),
  create: z.boolean().default(false),
  projectId: uuidV7.nullable().default(null),
  // privacy: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

export const patchRequestBodySchema = z.object({
  title: z.string().trim().nonempty(),
  privacy: z.enum(["public", "private"]),
}).strict().partial().refine((obj) => Object.keys(obj).length > 0)

export type PatchRequestBody = z.infer<typeof patchRequestBodySchema>;

export function validatePostRequest(body: unknown) {
  const result = postRequestBodySchema.safeParse(body)
  if (!result.success) {
    throw new AppError('bad_request:chat')
  }
  return result.data
}

export function validatePatchRequest(body: unknown) {
  const result = patchRequestBodySchema.safeParse(body)
  if (!result.success) {
    throw new AppError('bad_request:chat')
  }
  return result.data
}
