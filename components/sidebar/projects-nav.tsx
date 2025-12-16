'use client';
import { useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu, SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Forward,
  MoreHorizontal,
  Trash2,
  Settings,
  PencilLine,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { fetcher } from '@/lib/util'
import { LoadingDots } from '@/components/loading'
import type { ChatsByProjectRecord, ChatsByProjectResult } from '@/lib/db'

const PROJECTS_PAGE_SIZE = 3;
const PROJECT_CHATS_PAGE_SIZE = 5;

const getProjectHistoryKey = (pageIndex: number, previousPageData: ChatsByProjectResult | null) => {
  if (previousPageData && !previousPageData.nextCursor) {
    return null;
  }

  const searchParams = new URLSearchParams({
    limit: String(PROJECTS_PAGE_SIZE),
    chatsLimit: String(PROJECT_CHATS_PAGE_SIZE),
  });

  if (pageIndex > 0) {
    const cursor = previousPageData?.nextCursor;
    if (!cursor) {
      return null;
    }
    searchParams.set('cursor', cursor);
  }

  return `/api/project/history?${searchParams.toString()}`;
};

export function SidebarProjectsNav() {
  const { isMobile, setOpenMobile } = useSidebar();
  const params = useParams<{ id?: string }>();
  const activeChatId = typeof params?.id === 'string' ? params.id : undefined;
  const {
    data,
    isLoading,
    isValidating,
    setSize,
  } = useSWRInfinite<ChatsByProjectResult>(getProjectHistoryKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onError: (error) => toast.error(error.message),
  });

  const projects = useMemo<ChatsByProjectRecord[]>(
    () => data?.flatMap((page) => page.data) ?? [],
    [data],
  );
  const hasMoreProjects = !!data?.[data.length - 1]?.nextCursor;
  const isEmpty = !isLoading && projects.length === 0;
  const isLoadingMore = !isLoading && isValidating && hasMoreProjects;

  const handleLoadMore = useCallback(() => {
    if (!hasMoreProjects) return;
    void setSize((prev) => prev + 1);
  }, [hasMoreProjects, setSize]);

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
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
            {isLoading && (
              Array.from({ length: 2 }).map((_, index) => (
                <SidebarMenuItem key={`project-skeleton-${index}`}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            )}
            {projects.map(({ project, chats }) => (
              <Collapsible asChild defaultOpen className="group/collapsible-sub" key={project.id}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Folder className="group-data-[state=open]/collapsible-sub:hidden" />
                      <FolderOpen className="group-data-[state=closed]/collapsible-sub:hidden" />
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className='mr-0 pr-0'>
                      {chats.data.map((chat) => (
                        <SidebarMenuSubItem key={chat.id}>
                          <SidebarMenuSubButton isActive={chat.id === activeChatId} asChild>
                            <Link
                              href={`/chat/${chat.id}`}
                              onClick={() => {
                                setOpenMobile(false);
                              }}
                            >
                              {chat.title}
                            </Link>
                          </SidebarMenuSubButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">More</span>
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-44 rounded-lg"
                              side={isMobile ? "bottom" : "right"}
                              align={isMobile ? "end" : "start"}
                            >
                              <DropdownMenuItem>
                                <PencilLine className="text-muted-foreground" />
                                <span>Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Forward className="text-muted-foreground" />
                                <span>Share</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Trash2 className="text-muted-foreground" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuSubItem>
                      ))}
                      {!chats.data.length && (
                        <SidebarMenuSubItem>
                          <div className="text-xs text-sidebar-foreground/70 px-2 py-1">
                            Chats for this project will show up here.
                          </div>
                        </SidebarMenuSubItem>
                      )}
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
                      className="w-44 rounded-lg"
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                    >
                      <DropdownMenuItem>
                        <Settings className="text-muted-foreground" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Trash2 className="text-muted-foreground" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </Collapsible>
            ))}
            {isEmpty && (
              <SidebarMenuItem>
                <div className="text-xs text-sidebar-foreground/70 px-2 py-1">
                  Create a project to organize chats.
                </div>
              </SidebarMenuItem>
            )}
            {isLoadingMore && (
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            )}
            {hasMoreProjects && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='sm'
                  tooltip='Load more projects'
                  className="text-sidebar-foreground/70"
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                >
                  {isLoadingMore ? <LoadingDots className='text-lg' /> : <MoreHorizontal className="text-sidebar-foreground/70" />}
                  <span>{isLoadingMore ? 'Loading' : 'More'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
