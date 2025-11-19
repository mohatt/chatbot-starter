import { AppError } from '@/lib/errors'

function errorHandler() {
  return new AppError('not_found:api').toResponse();
}

export const POST = errorHandler;
export const GET = errorHandler;
