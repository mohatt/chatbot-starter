import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { validateGetRequest } from './schema'

export const GET = createApiHandler<RouteContext<'/api/project/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { limit, chatsLimit, cursor } = validateGetRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const result = await db.projects.findWithChats(user.id, limit, chatsLimit, cursor);
  return NextResponse.json(result);
})
