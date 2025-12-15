import { NextResponse } from 'next/server'
import { createApi } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { validateGetRequest } from './schema'

export const GET = createApi<RouteContext<'/api/chat/[id]/history'>>(async ({ api, session, request, params }) => {
  const { authz, db } = api;
  const { id, limit, before } = validateGetRequest(params.id, request.nextUrl.searchParams);
  const { user } = await session()
  const chat = await db.chats.findById(id);
  if (!authz.can(user, 'read:chat', chat)) {
    throw new AppError('not_found:chat')
  }
  const history = await db.messages.findByChatId(id, limit, before);
  return NextResponse.json(history);
})
