import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { uuidV7 } from '@/lib/schema'
import { getRequestBodySchema } from './schema'

export const GET = createApiHandler<RouteContext<'/api/chat/[id]/history'>>(
  async ({ api, session, request, params }) => {
    const { authz, db } = api
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const { searchParams } = request.nextUrl
    const { limit, before } = getRequestBodySchema.parse({
      before: searchParams.get('before') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    const chat = await db.chats.findById(id)
    if (!authz.can(user, 'read:chat', chat)) {
      throw new AppError('not_found:chat')
    }
    const history = await db.messages.findMany(id, limit, before)
    return NextResponse.json(history)
  },
  { namespace: 'chat' },
)
