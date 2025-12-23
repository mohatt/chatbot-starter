import type { AppError } from '@/lib/errors'
import type { QueryClient } from '@tanstack/react-query'

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError
  }
}
