import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/sidebar'
import { AuthProvider, GuestAuthProvider } from '@/components/auth-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ClientShell } from '@/components/client-shell'
import { Api } from '@/lib/api'
import { config } from '@/lib/config'

export default async function Layout({ children }: LayoutProps<'/'>) {
  const { auth } = Api.getInstance()
  const [session, cookieStore] = await Promise.all([auth.getSession(), cookies()])
  const sidebarState = cookieStore.get('sidebar_state')?.value
  const defaultSidebarOpen = sidebarState ? sidebarState !== 'false' : config.sidebar.defaultOpen
  const Auth = session ? AuthProvider : GuestAuthProvider

  return (
    <ClientShell>
      <Auth>
        <SidebarProvider defaultOpen={defaultSidebarOpen}>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </Auth>
    </ClientShell>
  )
}
