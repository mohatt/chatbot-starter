"use client";
import Link from "next/link";
import { SidebarUserNav } from "./user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Plus, FolderPlus, Sparkles } from "lucide-react"
import { SidebarChatsNav } from "./chats-nav"
import { SidebarProjectsNav } from "./projects-nav"

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link
                href="/"
                onClick={() => {
                  setOpenMobile(false);
                }}
              >
                  <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </span>
                <span className="font-semibold text-lg">
                  RAG Chatbot
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip='New Chat' asChild>
              <Link
                href="/"
                onClick={() => {
                  setOpenMobile(false);
                }}
              >
                <Plus className="" />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:list-item">
            <SidebarMenuButton className="">
              <FolderPlus className="" />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarProjectsNav />
        <SidebarChatsNav />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
