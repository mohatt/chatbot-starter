import { z } from 'zod'
import { createFileUploadSchema } from '@/lib/upload'
import type { ChatProjectRecord } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { config } from '@/lib/config'

const fileUpload = createFileUploadSchema(config.project.uploads.files.rules)

const postRequestBodySchema = z.object({
  name: z.string().trim().nonempty().max(32),
  prompt: z.string().trim().max(2000),
  deleteFiles: z.array(z.string().uuid()).max(32).default([]),
  create: z.boolean().default(false),
}).strict();

export async function validatePostRequest(formData: FormData) {
  const rawBody = formData.get('body')
  if (typeof rawBody !== 'string') {
    throw new AppError('bad_request:project')
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch (err) {
    throw new AppError('bad_request:project')
  }

  const body = postRequestBodySchema.safeParse(parsedBody)
  if (!body.success) {
    throw new AppError('bad_request:project')
  }

  const files = await fileUpload.parseArray(formData.getAll('files'))
  if (!files.data) {
    throw new AppError('bad_request:project', files.errors[0]?.message)
  }

  return {
    body: body.data,
    files: {
      data: files.data,
      errors: files.errors
    },
  }
}

export interface UpsertProjectBodyError {
  field: string
  index?: number
  message: string
}

export interface UpsertProjectBody {
  data: ChatProjectRecord | null
  errors: UpsertProjectBodyError[]
}
