import { AuthView } from '@daveyplate/better-auth-ui'
import { authViewPaths } from '@daveyplate/better-auth-ui/server'

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: PageProps<'/auth/[path]'>) {
  const { path } = await params
  return (
    <main className='flex items-center justify-center h-screen'>
      <AuthView path={path} />
    </main>
  )
}
