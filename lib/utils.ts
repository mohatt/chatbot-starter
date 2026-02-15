import { AppError, type ErrorCode } from '@/lib/errors'
import { v7 as uuidv7 } from 'uuid'
import { filesize } from 'filesize'
import { config } from '@/lib/config'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ChatRecord, ChatProjectRecord } from '@/lib/db'

export function getProjectUrl(project: Pick<ChatProjectRecord, 'id'>, full = false) {
  const path = `/project/${project.id}`
  return full ? `${config.baseUrl}${path}` : path
}

export function getChatUrl(chat: Pick<ChatRecord, 'id' | 'projectId'>, full = false) {
  const { id, projectId } = chat
  const path = projectId ? `/project/${projectId}/${id}` : `/chat/${id}`
  return full ? `${config.baseUrl}${path}` : path
}

export async function fetcher<D = unknown>(url: string, init?: RequestInit): Promise<D> {
  const response = await fetch(url, init)

  if (!response.ok) {
    let data: any
    try {
      data = await response.json()
    } catch {
      throw new AppError('bad_request:api', response.statusText)
    }
    throw new AppError(data.code as ErrorCode, data.cause)
  }

  return response.json()
}

export async function fetchWithOfflineHandler(input: RequestInfo | URL, init?: RequestInit) {
  try {
    const response = await fetch(input, init)

    if (!response.ok) {
      const { code, cause } = await response.json()
      throw new AppError(code as ErrorCode, cause)
    }

    return response
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new AppError('offline:chat')
    }

    throw error
  }
}

export function generateUUID(): string {
  return uuidv7()
}

export function getTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function formatFileSize(bytes: number): string {
  return filesize(bytes, { standard: 'jedec' })
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
