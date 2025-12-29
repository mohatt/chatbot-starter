import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api'
import { AppError } from '@/lib/errors'
import { validateUUIDv7 } from '@/lib/schema'
import { validatePostRequest, validatePatchRequest } from './schema'

export const POST = createApiHandler<RouteContext<'/api/project/[id]'>>(async ({ api, session, request, params }) => {
  const { db } = api;
  const id = validateUUIDv7(params.id)
  const { name, prompt } = validatePostRequest(await request.json());
  const { user } = await session()
  const data = await db.projects.create({
    id,
    name,
    prompt,
    userId: user.id,
  });
  return NextResponse.json(data, { status: 201 });
});

export const PATCH = createApiHandler<RouteContext<'/api/project/[id]'>>(async ({ api, session, request, params }) => {
  const id = validateUUIDv7(params.id)
  const body = validatePatchRequest(await request.json())
  const { user } = await session()
  const updatedProject = await api.db.projects.updateByIdForUser(id, user.id, body);
  return NextResponse.json(updatedProject);
});

export const GET = createApiHandler<RouteContext<'/api/project/[id]'>>(async ({ api, session, params }) => {
  const id = validateUUIDv7(params.id)
  const { user } = await session()
  const project = await api.db.projects.findById(id);
  if (!api.authz.can(user, 'read:project', project)) {
    throw new AppError('not_found:project')
  }
  return NextResponse.json(project);
});

export const DELETE = createApiHandler<RouteContext<'/api/project/[id]'>>(async ({ api, session, params }) => {
  const { db, vectorDb } = api;
  const id = validateUUIDv7(params.id);
  const { user } = await session()
  const project = await db.projects.findById(id);
  if (!api.authz.can(user, 'delete:project', project)) {
    throw new AppError('not_found:project')
  }
  // @todo delete project files
  await vectorDb.files.deleteByFilter(`projectId='${id}'`)
  const deletedProject = await db.projects.deleteById(id);
  return NextResponse.json(deletedProject);
});
