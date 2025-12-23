import { ClientShell } from '@/components/client-shell'
import { AuthProvider } from "@/components/auth-provider";

export default async function Layout({ children }: LayoutProps<'/auth/[path]'>) {
  return (
    <ClientShell>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClientShell>
  );
}
