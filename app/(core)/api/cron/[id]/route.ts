import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { handlers } from './handlers'

export const GET = createApiHandler<RouteContext<'/api/cron/[id]'>>(async ({ api, request, params }) => {
  const { env } = api
  const { id } = params;
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    throw new AppError('unauthorized:api');
  }

  const handler = handlers.get(id);
  if (!handler) {
    throw new AppError('not_found:api');
  }

  // @todo use a locking mechanism to prevent concurrent runs with the same id
  await handler(api);
  return NextResponse.json({ success: true });
})
