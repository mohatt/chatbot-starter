import { z } from 'zod';
import { config } from '@/lib/config'
import { uuidV7, timeZone } from '@/lib/schema'

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().trim().nonempty().max(2000),
});

export const postRequestBodySchema = z.object({
  message: z.object({
    id: uuidV7,
    role: z.enum(["user"]),
    parts: z.array(textPartSchema)
      .nonempty()
      .max(config.chat.message.maxParts),
    metadata: z.object({
      files: z.array(z.object({ id: uuidV7 })).optional(),
    }).optional(),
  }),
  timeZone,
  regenerate: z.boolean().default(false),
  createChat: z.boolean().default(false),
  projectId: uuidV7.nullable().default(null),
  model: config.chat.models.getKeySchema(),
});

export type PostRequestBody = z.input<typeof postRequestBodySchema>;

export const patchRequestBodySchema = z.object({
  title: z.string().trim().nonempty(),
  privacy: z.enum(["public", "private"]),
}).strict().partial().refine((obj) => Object.keys(obj).length > 0)

export type PatchRequestBody = z.input<typeof patchRequestBodySchema>;
