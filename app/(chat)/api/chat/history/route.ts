import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { getRequestBodySchema, deleteRequestBodySchema } from './schema'

export const GET = createApiHandler<RouteContext<'/api/chat/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { searchParams } = request.nextUrl;
  const { projectId, limit, cursor } = getRequestBodySchema.parse({
    projectId: searchParams.get('projectId') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
  })
  const { user } = await session()
  const result = await db.chats.findMany({ userId :user.id, projectId }, limit, cursor);
  return NextResponse.json(result);
}, { namespace: 'chat' });

export const DELETE = createApiHandler<RouteContext<'/api/chat/history'>>(async ({ api, session, request }) => {
  const { db } = api;
  const { searchParams } = request.nextUrl;
  const { projectId } = deleteRequestBodySchema.parse({
    projectId: searchParams.get('projectId') || undefined,
  });
  const { user } = await session()
  const deletedIds = await db.chats.deleteMany({ userId :user.id, projectId });
  return NextResponse.json(deletedIds);
}, { namespace: 'chat' });
