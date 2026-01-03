import { z } from 'zod';
import { uuidV7, timeZone } from '@/lib/schema'

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().trim().nonempty().max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string().nonempty().max(32),
  filename: z.string().trim().nonempty().max(128),
  url: z.url(),
});

const messagePartSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  message: z.object({
    id: uuidV7,
    role: z.enum(["user"]),
    parts: z.array(messagePartSchema).nonempty().max(10),
  }),
  timeZone,
  regenerate: z.boolean().default(false),
  createChat: z.boolean().default(false),
  projectId: uuidV7.nullable().default(null),
});

export type PostRequestBody = z.input<typeof postRequestBodySchema>;

export const patchRequestBodySchema = z.object({
  title: z.string().trim().nonempty(),
  privacy: z.enum(["public", "private"]),
}).strict().partial().refine((obj) => Object.keys(obj).length > 0)

export type PatchRequestBody = z.input<typeof patchRequestBodySchema>;
