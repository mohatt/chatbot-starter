'use client';
import { useCallback, useMemo, useState } from 'react'
import { useProjectsQuery } from '@/api/queries/projects'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu, SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LoadingDots } from '@/components/loading'
import {
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { useChatSettingsDialog } from '@/components/chat/dialogs/settings'
import { useDeleteChatDialog } from '@/components/chat/dialogs/delete'
import { useDeleteProjectDialog } from './dialogs/delete'
import { useDeleteAllProjectsDialog } from './dialogs/delete-all'
import { ProjectsSidebarItem } from './sidebar-item'
import type { ChatRecord, ChatProjectRecord } from '@/lib/db'

export interface ProjectSidebarProps {
  onUpsert: (chat: ChatProjectRecord | null) => void
}

export function ProjectsSidebar({ onUpsert }: ProjectSidebarProps) {
  const deleteDialog = useDeleteProjectDialog()
  const deleteAllDialog = useDeleteAllProjectsDialog()
  const chatSettingsDialog = useChatSettingsDialog();
  const deleteChatDialog = useDeleteChatDialog();
  const [chatTitleEditor, setChatTitleEditor] = useState<ChatRecord | null>(null);

  const { data, error, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage } = useProjectsQuery({
    refetchOnMount: false,
  })
  const projects = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const isEmpty = !isLoading && !error && projects.length === 0;
  const handleLoadMore = useCallback(() => {
    fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className='cursor-pointer relative'>
            <span>Projects</span>
            <ChevronRight className="ml-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            {projects.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuAction
                    onClick={(e) => {
                      deleteAllDialog.open()
                      e.stopPropagation();
                    }}
                    className='text-muted-foreground group-data-[state=closed]/collapsible:hidden'
                  >
                    <Trash2 />
                  </SidebarMenuAction>
                </TooltipTrigger>
                <TooltipContent align="end" className="hidden md:block">
                  Delete all projects
                </TooltipContent>
              </Tooltip>
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="cursor-pointer" onClick={() => onUpsert(null)}>
                <FolderPlus />
                <span>New project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isLoading && (
              Array.from({ length: 2 }).map((_, index) => (
                <SidebarMenuItem key={`project-skeleton-${index}`}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            )}
            {projects.map((project) => (
              <ProjectsSidebarItem
                key={project.id}
                project={project}
                onEdit={onUpsert}
                onDelete={deleteDialog.open}
                onChatDelete={deleteChatDialog.open}
                onChatEdit={setChatTitleEditor}
                onChatSettings={chatSettingsDialog.open}
                activeChatEditId={chatTitleEditor}
              />
            ))}
            {isEmpty && (
              <SidebarMenuItem>
                <div className="text-xs text-sidebar-foreground/70 px-2 py-1">
                  Create a project to organize chats.
                </div>
              </SidebarMenuItem>
            )}
            {error && (
              <SidebarMenuItem>
                <div className="text-xs text-destructive px-2 py-1">
                  Failed loading projects.
                </div>
              </SidebarMenuItem>
            )}
            {isFetchingNextPage && (
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            )}
            {hasNextPage && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='sm'
                  tooltip='Load more projects'
                  className="text-sidebar-foreground/70"
                  disabled={isFetchingNextPage}
                  onClick={handleLoadMore}
                >
                  {isFetchingNextPage ? (
                    <LoadingDots className='text-lg' />
                  ) : (
                    <MoreHorizontal className="text-sidebar-foreground/70" />
                  )}
                  <span>{isFetchingNextPage ? 'Loading' : 'More'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          {deleteDialog.render()}
          {deleteAllDialog.render()}
          {deleteChatDialog.render()}
          {chatSettingsDialog.render()}
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
