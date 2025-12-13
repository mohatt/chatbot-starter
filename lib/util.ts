import { AppError, type ErrorCode } from '@/lib/errors'
import { v7 as uuidv7 } from 'uuid';
import { filesize } from 'filesize';

export async function fetcher<D = any>(url: string): Promise<D> {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new AppError(code as ErrorCode, cause);
  }

  return response.json();
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new AppError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new AppError('offline:chat');
    }

    throw error;
  }
}

export function generateUUID(): string {
  return uuidv7();
}

export function getTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatFileSize(bytes: number): string {
  return filesize(bytes, { standard: 'jedec' });
}
