import { AuthView } from "@daveyplate/better-auth-ui"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: PageProps<'/auth/[path]'>) {
  const { path } = await params
  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center self-center p-4 md:p-8">
      <AuthView path={path} />
    </main>
  )
}
