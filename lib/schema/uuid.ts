import { z } from 'zod'
import { AppError, type ErrorCode } from '@/lib/errors'

export const uuidV7 = z.uuid({ version: 'v7' })

export function validateUUIDv7(val: unknown, errCode: ErrorCode = 'bad_request:api') {
  const result = uuidV7.safeParse(val)
  if(!result.success) {
    throw new AppError(errCode, 'Malformed ID')
  }
  return result.data
}
