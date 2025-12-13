import type { ReactNode } from 'react'
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient()

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
