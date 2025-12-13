import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({
  children,
}: {
  children: ReactNode
}) {
  const [cookieStore] = await Promise.all([cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <>
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={undefined} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
