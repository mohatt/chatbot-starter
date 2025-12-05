import { z } from 'zod';
import { AppError } from '@/lib/errors'
import { isValidTimeZone } from '@/lib/util'

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema).min(1).max(10),
  }),
  timeZone: z.string().nonempty().refine(isValidTimeZone, 'Invalid time zone'),
  regenerate: z.boolean().default(false),
  // visibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

export function validatePostRequestBody(body: unknown) {
  try {
    return postRequestBodySchema.parse(body)
  } catch (_err) {
    throw new AppError('bad_request:chat')
  }
}
