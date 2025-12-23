"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail, SidebarMenuAction,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useProjectUpsertDialog } from '@/components/project/dialogs/upsert'
import { ChatsSidebar } from "@/components/chat/sidebar"
import { ProjectsSidebar } from "@/components/project/sidebar"
import { UserSidebar } from "@/components/user/sidebar";
import { SquarePen, FolderPlus, Sparkles, MoreHorizontal, PanelLeftIcon } from 'lucide-react'
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function AppSidebar() {
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const projectDialog = useProjectUpsertDialog()
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className='group-data-[collapsible=icon]:hidden'>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </span>
                <span className="font-semibold text-lg">
                  RAG Chatbot
                </span>
              </Link>
            </SidebarMenuButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuAction asChild>
                  <SidebarTrigger />
                </SidebarMenuAction>
              </TooltipTrigger>
              <TooltipContent align="start" className="hidden md:block">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:list-item">
            <SidebarMenuButton className="group-hover:hidden cursor-pointer" asChild>
              <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex aspect-square size-8 items-center justify-center rounded-lg">
                <Sparkles className="size-4" />
              </span>
            </SidebarMenuButton>
            <SidebarMenuButton tooltip='Open sidebar' className="cursor-pointer hidden group-hover:flex" asChild>
              <SidebarTrigger />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip='New chat' asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <SquarePen />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:list-item">
            <SidebarMenuButton tooltip='New project' className="cursor-pointer" onClick={() => projectDialog.open(null)}>
              <FolderPlus />
              <span>New project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ProjectsSidebar onUpsert={projectDialog.open} />
        <ChatsSidebar />
      </SidebarContent>
      <SidebarFooter>
        <UserSidebar />
      </SidebarFooter>
      <SidebarRail />
      {projectDialog.render()}
    </Sidebar>
  );
}
