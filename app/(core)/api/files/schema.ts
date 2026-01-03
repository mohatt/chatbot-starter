import { z } from 'zod'
import { config } from '@/lib/config'
import { jsonString, fileUpload, uuidV7 } from '@/lib/schema'
import { chatStorageMetadataSchema, projectStorageMetadataSchema } from '@/lib/storage/schema'

const chatMetadataSchema = chatStorageMetadataSchema
  .omit({ bucket: true })

const projectMetadataSchema = projectStorageMetadataSchema
  .omit({ bucket: true })

const fileUploadSchema = z.discriminatedUnion('bucket', [
  z.strictObject({
    file: fileUpload(config.project.uploads.images.rules),
    bucket: z.literal('images'),
    metadata: chatMetadataSchema
  }),
  z.strictObject({
    file: fileUpload(config.project.uploads.files.rules),
    bucket: z.literal('retrieval'),
    metadata: z.discriminatedUnion('namespace', [
      chatMetadataSchema,
      projectMetadataSchema,
    ])
  }),
])

export const postRequestBodySchema = z.instanceof(FormData)
  .transform((val) => {
    return {
      file: val.get('file'),
      bucket: val.get('bucket'),
      metadata: val.get('metadata'),
    }
  })
  .pipe(z.object({
    file: z.file(),
    bucket: z.string(),
    metadata: jsonString(z.unknown())
  }))
  .pipe(fileUploadSchema)

export type PostRequestBody = z.input<typeof fileUploadSchema>

export const getRequestBodySchema = z.object({
  projectId: uuidV7,
});

export type GetRequestBody = z.input<typeof getRequestBodySchema>

export const deleteRequestBodySchema = z.object({
  id: uuidV7,
});

export type DeleteRequestBody = z.input<typeof deleteRequestBodySchema>
