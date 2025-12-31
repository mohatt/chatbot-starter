import { z } from 'zod'

const baseStorageMetadataSchema = z.strictObject({
  namespace: z.string().nonempty(),
  bucket: z.string().nonempty(),
})

export const chatStorageMetadataSchema = baseStorageMetadataSchema
  .extend({
    namespace: z.literal('chat'),
    chatId: z.uuid({ version: 'v7' }),
  })

export const projectStorageMetadataSchema = baseStorageMetadataSchema
  .extend({
    namespace: z.literal('project'),
    projectId: z.uuid({ version: 'v7' }),
  })

export const storageMetadataSchema = z.discriminatedUnion('namespace', [
  chatStorageMetadataSchema,
  projectStorageMetadataSchema,
])

export type StorageMetadata = z.input<typeof storageMetadataSchema>
