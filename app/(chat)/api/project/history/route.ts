import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { validateGetRequest } from './schema'

export const GET = createApiHandler<RouteContext<'/api/project/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { limit, cursor } = validateGetRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const result = await db.projects.findMany({ userId :user.id }, limit, cursor);
  return NextResponse.json(result);
})

export const DELETE = createApiHandler<RouteContext<'/api/project/history'>>(async ({ api, session }) => {
  const { db, vectorDb } = api;
  const { user } = await session()
  const deletedIds = await db.projects.deleteMany({ userId :user.id });
  if (deletedIds.length) {
    await vectorDb.content.deleteByFilter(`projectId IN ('${deletedIds.join(`', '`)}')`)
  }
  return NextResponse.json(deletedIds);
});
