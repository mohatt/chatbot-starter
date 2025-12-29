import z from 'zod'
import { jsonString, fileUpload, uuidV7 } from '@/lib/schema'
import { config } from '@/lib/config'
import { AppError } from '@/lib/errors'

const baseMetadataSchema = z.object({
  namespace: z.string(),
})

const chatMetadataSchema = baseMetadataSchema
  .extend({
    namespace: z.literal('chat'),
    chatId: z.uuid({ version: 'v7' }),
  })
  .strict()

const projectMetadataSchema = baseMetadataSchema
  .extend({
      namespace: z.literal('project'),
      projectId: z.uuid({ version: 'v7' }),
    })
  .strict()

const userMetadataSchema = baseMetadataSchema
  .extend({
    namespace: z.literal('user'),
  })
  .strict()

const fileUploadSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('avatar'),
    file: fileUpload(config.project.uploads.images.rules),
    metadata: userMetadataSchema
  }),
  z.strictObject({
    type: z.literal('image'),
    file: fileUpload(config.project.uploads.images.rules),
    metadata: chatMetadataSchema
  }),
  z.strictObject({
    type: z.literal('retrieval'),
    file: fileUpload(config.project.uploads.files.rules),
    metadata: z.discriminatedUnion('namespace', [
      chatMetadataSchema,
      projectMetadataSchema,
    ])
  }),
])

export type FileUploadRequest = z.input<typeof fileUploadSchema>

const formDataFileUploadSchema = z.instanceof(FormData)
  .transform((val) => {
    return {
      type: val.get('type'),
      metadata: val.get('metadata'),
      file: val.get('file'),
    }
  })
  .pipe(z.object({
    type: z.string(),
    metadata: jsonString(z.unknown()),
    file: z.file()
  }))
  .pipe(fileUploadSchema)

export const getRequestBodySchema = z.object({
  projectId: uuidV7,
}).strict();

export const deleteRequestBodySchema = z.object({
  id: uuidV7,
}).strict();

export function validatePostRequest(formData: FormData) {
  const result = formDataFileUploadSchema.safeParse(formData)
  if (!result.success) {
    throw new AppError('bad_request:file', result.error)
  }
  return result.data
}

export function validateGetRequest(params: URLSearchParams) {
  const result = getRequestBodySchema.safeParse({
    projectId: params.get('projectId') || undefined,
  })
  if (!result.success) {
    throw new AppError('bad_request:file', result.error)
  }
  return result.data
}

export function validateDeleteRequest(params: URLSearchParams) {
  const result = deleteRequestBodySchema.safeParse({
    id: params.get('id') || undefined,
  })
  if (!result.success) {
    throw new AppError('bad_request:file', result.error)
  }
  return result.data
}
