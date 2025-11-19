import { AppError, ErrorCode } from '@/lib/errors'

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
