import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { handlers } from './handlers'

export const GET = createApiHandler<RouteContext<'/api/cron/[id]'>>(
  async ({ api, request, params }) => {
    const { env, db } = api
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      throw new AppError('unauthorized:api')
    }

    const { id } = params
    const handler = handlers.get(id)
    if (!handler) {
      throw new AppError('not_found:api')
    }

    // TTL avoids stale locks if a run crashes or times out (10 minutes)
    const lockTTL = 10 * 60 * 1000
    const lockRow = await db.cronJobs.acquireLock(id, lockTTL)
    if (!lockRow) {
      throw new AppError('rate_limit:api')
    }

    let error: string | null
    try {
      await handler(api)
      error = null
    } catch (err) {
      error = String(err)
    }

    // Mark the cron job as complete and release the lock
    await db.cronJobs.complete(id, lockRow.lockId!, error)

    return NextResponse.json({ status: error ? 'error' : 'success' })
  },
)
