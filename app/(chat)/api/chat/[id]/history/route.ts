import { NextResponse } from 'next/server'
import { createApi } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { validateGetRequest } from './schema'

export const GET = createApi<RouteContext<'/api/chat/[id]/history'>>(async ({ api, request, params }) => {
  const { db } = api;
  const { id, limit, before } = validateGetRequest(params.id, request.nextUrl.searchParams);
  const chat = await db.chats.getById(id);
  if (!api.canAccessChat('read', chat)) {
    throw new AppError('not_found:chat')
  }
  const history = await db.chats.getMessages(id, limit, before);
  return NextResponse.json(history);
})
