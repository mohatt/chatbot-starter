import { z } from 'zod'
import { validate as validateUUID, version as getUUIDVersion } from 'uuid'
import { AppError, type ErrorCode } from '@/lib/errors'

export function uuidSchema<V extends number>(version?: V) {
  return z.string().transform((val, ctx) => {
    if (!validateUUID(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid UUID',
      })
      return z.NEVER
    }

    if (version != null && getUUIDVersion(val) !== version) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid UUIDv${version}`,
      })
      return z.NEVER
    }

    return val
  })
}

export const uuidV7 = uuidSchema(7)

export function validateUUIDv7(val: unknown, errCode: ErrorCode = 'bad_request:api') {
  const result = uuidV7.safeParse(val)
  if(!result.success) {
    throw new AppError(errCode, 'Malformed ID')
  }
  return result.data
}
