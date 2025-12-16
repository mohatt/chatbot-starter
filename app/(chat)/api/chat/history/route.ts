import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { validateGetRequest, validateDeleteRequest } from './schema'

export const GET = createApiHandler<RouteContext<'/api/chat/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { limit, cursor } = validateGetRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const result = await db.chats.findByUser(user.id, limit, cursor);
  return NextResponse.json(result);
})

export const DELETE = createApiHandler<RouteContext<'/api/chat/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { projectId } = validateDeleteRequest(request.nextUrl.searchParams);
  const { user } = await session()
  const deletedCount = await db.chats.deleteMany({ userId :user.id, projectId });
  return NextResponse.json(deletedCount);
});
