import { AuthProvider } from "@/components/auth-provider";

export default async function Layout({ children }: LayoutProps<'/auth/[path]'>) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
