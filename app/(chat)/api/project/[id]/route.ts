import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { uuidV7 } from '@/lib/schema'
import { postRequestBodySchema, patchRequestBodySchema } from './schema'

export const POST = createApiHandler<RouteContext<'/api/project/[id]'>>(
  async ({ api, session, request, params }) => {
    const { db } = api
    const id = uuidV7.parse(params.id)
    const { name, prompt } = postRequestBodySchema.parse(await request.json())
    const { user } = await session()
    const data = await db.projects.create({
      id,
      name,
      prompt,
      userId: user.id,
    })
    return NextResponse.json(data, { status: 201 })
  },
  { namespace: 'project' },
)

export const PATCH = createApiHandler<RouteContext<'/api/project/[id]'>>(
  async ({ api, session, request, params }) => {
    const id = uuidV7.parse(params.id)
    const body = patchRequestBodySchema.parse(await request.json())
    const { user } = await session()
    const updatedProject = await api.db.projects.updateByIdForUser(id, user.id, body)
    return NextResponse.json(updatedProject)
  },
  { namespace: 'project' },
)

export const GET = createApiHandler<RouteContext<'/api/project/[id]'>>(
  async ({ api, session, params }) => {
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const project = await api.db.projects.findById(id)
    if (!api.authz.can(user, 'read:project', project)) {
      throw new AppError('not_found:project')
    }
    return NextResponse.json(project)
  },
  { namespace: 'project' },
)

export const DELETE = createApiHandler<RouteContext<'/api/project/[id]'>>(
  async ({ api, session, params }) => {
    const { db } = api
    const id = uuidV7.parse(params.id)
    const { user } = await session()
    const project = await db.projects.findById(id)
    if (!api.authz.can(user, 'delete:project', project)) {
      throw new AppError('not_found:project')
    }
    const deletedProject = await db.projects.deleteById(id)
    return NextResponse.json(deletedProject)
  },
  { namespace: 'project' },
)
