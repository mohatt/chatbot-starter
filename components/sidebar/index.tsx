"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { SidebarUserNav } from "./user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton, SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Plus,
  Folder,
  FolderPlus,
  FolderOpen,
  Forward,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  Sparkles,
  CircleAlert
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function AppSidebar(props: { user: object | undefined }) {
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(() => 'history-key'));
        router.push("/");
        setShowDeleteAllDialog(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
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
          <Collapsible
            asChild
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className='cursor-pointer'>
                  <span>Projects</span>
                  <ChevronRight className="ml-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="">
                      <FolderPlus className="" />
                      <span>New Project</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {[{ name: 'Test Project', url: 'test.dev' }].map((item) => (
                    <Collapsible asChild defaultOpen className="group/collapsible-sub" key={item.name}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <Folder className="group-data-[state=open]/collapsible-sub:hidden" />
                            <FolderOpen className="group-data-[state=closed]/collapsible-sub:hidden" />
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className='mr-0 pr-0'>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <a href='xxx'>
                                  <span>Child</span>
                                </a>
                              </SidebarMenuSubButton>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <SidebarMenuAction showOnHover>
                                    <MoreHorizontal />
                                    <span className="sr-only">More</span>
                                  </SidebarMenuAction>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="w-48 rounded-lg"
                                  side={isMobile ? "bottom" : "right"}
                                  align={isMobile ? "end" : "start"}
                                >
                                  <DropdownMenuItem>
                                    <Folder className="text-muted-foreground" />
                                    <span>View Project</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Forward className="text-muted-foreground" />
                                    <span>Share Project</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Trash2 className="text-muted-foreground" />
                                    <span>Delete Project</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </SidebarMenuSubItem>
                            <SidebarMenuItem>
                              <SidebarMenuSkeleton />
                            </SidebarMenuItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal />
                              <span className="sr-only">More</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                          >
                            <DropdownMenuItem>
                              <Folder className="text-muted-foreground" />
                              <span>View Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Forward className="text-muted-foreground" />
                              <span>Share Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Trash2 className="text-muted-foreground" />
                              <span>Delete Project</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton size='sm' tooltip='load more' className="text-sidebar-foreground/70">
                      <MoreHorizontal className="text-sidebar-foreground/70" />
                      <span>More</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
          <Collapsible
            asChild
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className='cursor-pointer relative'>
                  <span>Chats</span>
                  <ChevronRight className="ml-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuAction
                        onClick={(e) => {
                          setShowDeleteAllDialog(true)
                          e.stopPropagation();
                        }}
                        className='text-muted-foreground group-data-[state=closed]/collapsible:hidden'
                      >
                        <Trash2 />
                      </SidebarMenuAction>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>Test Chat</span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontal />
                          <span className="sr-only">More</span>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-48 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align={isMobile ? "end" : "start"}
                      >
                        <DropdownMenuItem>
                          <Folder className="text-muted-foreground" />
                          <span>View Project</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="text-muted-foreground" />
                          <span>Share Project</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Trash2 className="text-muted-foreground" />
                          <span>Delete Project</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserNav />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog onOpenChange={setShowDeleteAllDialog} open={showDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              <Alert variant='destructive'>
                <CircleAlert />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This will permanently delete all your chats from our servers.
                  This action cannot be undone.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
