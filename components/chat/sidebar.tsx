'use client';
import { useCallback, useMemo, useState } from 'react'
import { useChatParams } from '@/components/chat/hooks'
import { useChatsQuery } from '@/api/hooks/chats'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion'
import {
  MoreHorizontal,
  Trash2,
  ChevronRight,
} from 'lucide-react'
import { useDeleteChatDialog } from '@/components/chat/dialogs/delete'
import { useChatSettingsDialog } from '@/components/chat/dialogs/settings'
import { useDeleteAllChatsDialog } from '@/components/chat/dialogs/delete-all'
import { ChatListItem } from './list-item'
import type { ChatRecord } from '@/lib/db'

export function ChatsSidebar() {
  const { activeChatId } = useChatParams();
  const [showTitleEditor, setShowTitleEditor] = useState<ChatRecord | null>(null);
  const settingsDialog = useChatSettingsDialog();
  const deleteDialog = useDeleteChatDialog();
  const deleteAllDialog = useDeleteAllChatsDialog();

  const { data, error, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage } = useChatsQuery({
    variables: { projectId: null },
    refetchOnMount: false,
  });
  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const isEmpty = !isLoading && !error && chats.length === 0;
  const handleLoadMore = useCallback(() => {
    fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);

  return (
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
            {chats.length > 0 && (
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
                  Delete All Chats
                </TooltipContent>
              </Tooltip>
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            {isLoading && (
              Array.from({ length: 3 }).map((_, index) => (
                <SidebarMenuItem key={`chat-skeleton-${index}`}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              ))
            )}
            {chats.map((chat) => (
              <ChatListItem
                variant='sidebar'
                chat={chat}
                onEdit={setShowTitleEditor}
                onDelete={deleteDialog.open}
                onSettings={settingsDialog.open}
                isActive={chat.id === activeChatId}
                isEdit={showTitleEditor === chat}
                key={chat.id}
              />
            ))}
            {isEmpty && (
              <SidebarMenuItem>
                <div className="text-xs text-sidebar-foreground/70 px-2 py-1 whitespace-nowrap">
                  Start a chat to see it listed here.
                </div>
              </SidebarMenuItem>
            )}
            {error && (
              <SidebarMenuItem>
                <div className="text-xs text-destructive px-2 py-1 whitespace-nowrap">
                  Failed loading chats.
                </div>
              </SidebarMenuItem>
            )}
            {isFetchingNextPage && (
              <SidebarMenuItem>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <SidebarMenuItem>
                <motion.div onViewportEnter={handleLoadMore} />
                <SidebarMenuButton
                  size='sm'
                  tooltip='Load more chats'
                  className="text-sidebar-foreground/70"
                  onClick={handleLoadMore}
                >
                  <MoreHorizontal className="text-sidebar-foreground/70" />
                  <span>More</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          {deleteDialog.render()}
          {settingsDialog.render()}
          {deleteAllDialog.render()}
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
