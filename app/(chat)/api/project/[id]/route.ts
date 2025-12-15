import { NextResponse } from 'next/server';
import { createApi } from '@/lib/api'
import type { ChatProjectRecordInput, ChatProjectRecordFile } from '@/lib/db'
import { FileLoader, type FileLoaderDoc } from '@/lib/document'
import { AppError } from '@/lib/errors'
import { config } from '@/lib/config'
import { validateUUIDv7 } from '@/lib/schema'
import { UpsertProjectBody, UpsertProjectBodyError, validatePostRequest } from './schema'

export const POST = createApi<RouteContext<'/api/project/[id]'>>(async ({ api, session, request, params }) => {
  const { db, vectorDb } = api;
  const id = validateUUIDv7(params.id)
  const { body, files } = await validatePostRequest(await request.formData());
  const { user } = await session()
  const { name, prompt, create, deleteFiles } = body;
  let project: ChatProjectRecordInput
  if (create) {
    project = {
      id,
      name,
      prompt,
      userId: user.id,
      files: [],
    }
  } else {
    const dbProject = await db.projects.findById(id);
    if (!api.authz.can(user, 'write:project', dbProject)) {
      throw new AppError('not_found:project')
    }
    project = dbProject;
  }

  const newFileVectors: FileLoaderDoc[] = []
  const newFiles: ChatProjectRecordFile[] = [];
  const errors: UpsertProjectBodyError[] = []

  for (const { index, message } of files.errors) {
    errors.push({ field: 'files', index, message })
  }

  const loader = new FileLoader({ projectId: project.id }, config.fileLoader);
  for (const { index, file } of files.data) {
    try {
      const { docs, tokens } = await loader.load(file)
      if (!docs.length || !tokens) {
        continue;
      }
      const { blob, ...fileInfo } = file
      newFiles.push({
        ...fileInfo,
        tokens: tokens,
        vectors: docs.length,
      })
      newFileVectors.push(...docs)
    } catch (err) {
      errors.push({ field: 'files', index, message: `Failed to load file data` })
    }
  }

  if (newFileVectors.length) {
    await vectorDb.content.insert(newFileVectors)
  }

  if (create) {
    const data = await db.projects.create({
      ...project,
      files: newFiles,
    });
    return NextResponse.json<UpsertProjectBody>({ data, errors }, { status: 201 });
  }

  const updatedFiles = [...project.files, ...newFiles]
  if (deleteFiles.length) {
    const validDeletedIds: string[] = []
    deleteFiles.forEach((file, index) => {
      const deleteIndex = updatedFiles.findIndex(f => f.id === file)
      if (deleteIndex !== -1) {
        validDeletedIds.push(file)
        updatedFiles.splice(deleteIndex, 1)
      } else {
        errors.push({ field: 'deleteFiles', index, message: `File not found` })
      }
    })
    if (validDeletedIds.length) {
      await vectorDb.content.deleteByFilter(`file.id in (${validDeletedIds.join(',')})`)
    }
  }
  const data = await db.projects.updateById(project.id, {
    name,
    prompt,
    files: updatedFiles,
  })

  return NextResponse.json<UpsertProjectBody>({ data, errors }, { status: 200 });
});

export const GET = createApi<RouteContext<'/api/project/[id]'>>(async ({ api, session, params }) => {
  const id = validateUUIDv7(params.id)
  const { user } = await session()
  const project = await api.db.projects.findById(id);
  if (!api.authz.can(user, 'read:project', project)) {
    throw new AppError('not_found:project')
  }
  return NextResponse.json(project);
});

export const DELETE = createApi<RouteContext<'/api/project/[id]'>>(async ({ api, session, params }) => {
  const { db, vectorDb } = api;
  const id = validateUUIDv7(params.id);
  const { user } = await session()
  const project = await db.projects.findById(id);
  if (!api.authz.can(user, 'delete:project', project)) {
    throw new AppError('not_found:project')
  }
  await vectorDb.content.deleteByFilter(`projectId='${id}'`)
  const deletedProject = await db.projects.deleteById(id);
  return NextResponse.json(deletedProject);
});
