'use client'
import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'
import { useQueryClient } from '@tanstack/react-query'
import { billingClient } from '@/lib/auth/plugins/billing/client'
import { AuthUIProvider, useAuthenticate } from '@daveyplate/better-auth-ui'
import { LoadingDots } from '@/components/loading'
import Link from 'next/link'

export const authClient = createAuthClient({
  plugins: [anonymousClient(), billingClient()],
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleSessionChange = useCallback(() => {
    queryClient.clear()
    router.refresh()
  }, [queryClient, router])

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={handleSessionChange}
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
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (success || loading !== undefined) return

    const signIn = async () => {
      setLoading(true)
      console.log('guest login started')
      try {
        const { data } = await authClient.signIn.anonymous()
        return !!data?.user.id
      } catch {
        return false
      } finally {
        setLoading(false)
      }
    }

    void signIn().then((signedIn) => {
      if (signedIn) {
        return setSuccess(true)
      }

      const { search, pathname } = window.location
      const searchParams = new URLSearchParams(search)
      const redirectTo = searchParams.get('redirectTo') || pathname + search
      router.replace(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`)
    })
  }, [loading, router])

  if (loading !== false || !success) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <LoadingDots className='text-4xl' />
      </div>
    )
  }

  console.log('guest login done')
  return <AuthProvider>{children}</AuthProvider>
}

export function useAuth() {
  return useAuthenticate({ enabled: true, authClient })
}
