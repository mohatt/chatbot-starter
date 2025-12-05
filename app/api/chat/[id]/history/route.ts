import { NextResponse } from 'next/server'
import { createApi } from '@/lib/api'
import { config } from '@/lib/config'

export const GET = createApi<RouteContext<'/api/chat/[id]/history'>>(async ({ api, request, params }) => {
  const { db } = api;
  const { id } = params;
  const chat = await db.chats.getById(id);
  await api.ensureChatAccess('read', chat)
  const before = request.nextUrl.searchParams.get('before') || undefined;
  const history = await db.chats.getMessages(id, config.chat.history.limit, before);
  return NextResponse.json(history);
})
