'use client';
import { useCallback, useMemo, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
  useSidebar, SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Forward,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  PencilLine
} from 'lucide-react'
import { DeleteChatDialog, DeleteAllChatsDialog } from '@/components/chat/delete-dialog'
import { toast } from "sonner";
import { fetcher } from '@/lib/util'
import type { ChatRecord, ChatsResult } from '@/lib/db'

const CHAT_HISTORY_PAGE_SIZE = 25;

const getChatHistoryKey = (pageIndex: number, previousPageData: ChatsResult | null) => {
  if (previousPageData && !previousPageData.nextCursor) {
    return null;
  }

  const searchParams = new URLSearchParams({
    limit: String(CHAT_HISTORY_PAGE_SIZE),
  });

  if (pageIndex > 0) {
    const cursor = previousPageData?.nextCursor;
    if (!cursor) {
      return null;
    }
    searchParams.set('cursor', cursor);
  }

  return `/api/chat/history?${searchParams.toString()}`;
};

export function SidebarChatsNav() {
  const { isMobile, setOpenMobile } = useSidebar();
  const params = useParams<{ id?: string }>();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<ChatRecord | null>(null);
  const {
    data,
    setSize,
    isLoading,
    isValidating,
    mutate: mutateChatHistory,
  } = useSWRInfinite<ChatsResult>(getChatHistoryKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onError: (error) => toast.error(error.message),
  });

  const chats = useMemo(
    () => data?.flatMap((page) => page.data) ?? [],
    [data],
  );
  const hasMore = Boolean(data && data[data.length - 1]?.nextCursor);
  const isEmpty = !isLoading && chats.length === 0;
  const isLoadingMore = !isLoading && isValidating && hasMore;
  const activeChatId = typeof params?.id === 'string' ? params.id : undefined;

  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    void setSize((prev) => prev + 1);
  }, [hasMore, setSize]);

  const handleChatsCleared = useCallback(async () => {
    await mutateChatHistory([], { revalidate: false });
    await setSize(1);
    await mutateChatHistory();
  }, [mutateChatHistory, setSize]);

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
            {isLoading && (
              Array.from({ length: 3 }).map((_, index) => (
                <SidebarMenuItem key={`chat-skeleton-${index}`}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              ))
            )}
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  isActive={chat.id === activeChatId}
                >
                  <Link
                    href={`/chat/${chat.id}`}
                    onClick={() => {
                      setOpenMobile(false);
                    }}
                  >
                    <span>{chat.title}</span>
                  </Link>
                </SidebarMenuButton>
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
                    <DropdownMenuItem variant='destructive' onClick={() => setShowDeleteDialog(chat)}>
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
            {isEmpty && (
              <SidebarMenuItem>
                <div className="text-xs text-sidebar-foreground/70 px-2 py-1">
                  Start a chat to see it listed here.
                </div>
              </SidebarMenuItem>
            )}
            {isLoadingMore && (
              <SidebarMenuItem>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            )}
            {hasMore && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='sm'
                  tooltip='Load more chats'
                  className="text-sidebar-foreground/70"
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                >
                  <MoreHorizontal className="text-sidebar-foreground/70" />
                  <span>{isLoadingMore ? 'Loading…' : 'More'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <DeleteAllChatsDialog
            open={showDeleteAllDialog}
            onOpenChange={setShowDeleteAllDialog}
            onDelete={handleChatsCleared}
          />
          <DeleteChatDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          />
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
