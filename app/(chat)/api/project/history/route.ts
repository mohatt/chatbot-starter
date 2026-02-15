import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { getRequestBodySchema } from './schema'

export const GET = createApiHandler<RouteContext<'/api/project/history'>>(
  async ({ api, session, request }) => {
    const { db } = api
    const { searchParams } = request.nextUrl
    const { limit, cursor } = getRequestBodySchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    const { user } = await session()
    const result = await db.projects.findMany({ userId: user.id }, limit, cursor)
    return NextResponse.json(result)
  },
  { namespace: 'project' },
)

export const DELETE = createApiHandler<RouteContext<'/api/project/history'>>(
  async ({ api, session }) => {
    const { db, vectorDb } = api
    const { user } = await session()
    const deletedIds = await db.projects.deleteMany({ userId: user.id })
    if (deletedIds.length) {
      await vectorDb.files.deleteByFilter(`projectId IN ('${deletedIds.join(`', '`)}')`)
    }
    return NextResponse.json(deletedIds)
  },
  { namespace: 'project' },
)
