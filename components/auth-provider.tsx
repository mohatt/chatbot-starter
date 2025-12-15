"use client";
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from "next/navigation"
import { createAuthClient } from "better-auth/react"
import { anonymousClient } from "better-auth/client/plugins"
import { billingClient } from '@/lib/auth/plugins/billing/client'
import { AuthUIProvider, useAuthenticate } from "@daveyplate/better-auth-ui"
import { LoadingDots } from '@/components/loading'
import Link from "next/link"

export const authClient = createAuthClient({
  plugins: [anonymousClient(), billingClient()],
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      // Clear router cache (protected routes)
      onSessionChange={router.refresh}
      changeEmail={false}
      deleteUser
      Link={Link}
      gravatar
    >
      {children}
    </AuthUIProvider>
  )
}

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>()
  const [result, setResult] = useState<Record<'data' | 'error', string | null>>()

  useEffect(() => {
    if (loading !== undefined) return

    const run = async () => {
      setLoading(true)
      console.log('guest login started')
      try {
        const { data, error } = await authClient.signIn.anonymous()
        setResult({
          data: data?.user.id || null,
          error: error?.message || error?.statusText || null,
        })
      } catch (error) {
        setResult({ data: null, error: String(error) })
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [loading])

  if (loading !== false) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingDots className='text-4xl' />
      </div>
    )
  }

  console.log('guest login result', result)
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

export function useAuth() {
  return useAuthenticate({ enabled: true, authClient })
}
