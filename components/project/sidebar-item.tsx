'use client';
import { useMemo } from 'react'
import { useChatParams } from '@/components/chat/hooks'
import { useChatsQuery } from '@/api/queries/chats'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  useSidebar,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Folder,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Settings,
} from 'lucide-react'
import { ChatListItem } from '@/components/chat/list-item'
import { getProjectUrl } from '@/lib/util'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ChatProjectRecord, ChatRecord } from '@/lib/db'

const MAX_CHATS_SLICE = 5

export interface ProjectsSidebarItemProps {
  project: ChatProjectRecord;
  onEdit: (project: ChatProjectRecord) => void
  onDelete: (project: ChatProjectRecord) => void;
  onChatEdit: (chat: ChatRecord | null) => void;
  onChatDelete: (chat: ChatRecord) => void;
  onChatSettings: (chat: ChatRecord) => void;
  activeChatEditId: ChatRecord | null
}

export function ProjectsSidebarItem(props: ProjectsSidebarItemProps) {
  const { project, onEdit, onDelete, onChatEdit, onChatDelete, onChatSettings, activeChatEditId } = props
  const { isMobile, setOpenMobile } = useSidebar();
  const { activeProjectId, activeChatId } = useChatParams();
  const { data } = useChatsQuery({
    variables: { projectId: project.id },
  })

  const { chats, hasMore } = useMemo(
    () => {
      const fp = data?.pages[0]
      return {
        chats: fp?.data.slice(0, MAX_CHATS_SLICE) ?? [],
        hasMore: !!fp && (fp.data.length > MAX_CHATS_SLICE || fp.nextCursor != null),
      }
    },
    [data],
  );

  return (
    <Collapsible className="group/collapsible-sub" defaultOpen asChild>
      <SidebarMenuItem>
        <SidebarMenuButton isActive={project.id === activeProjectId} asChild>
          <div>
            <CollapsibleTrigger>
              <Folder className="size-4 group-data-[state=open]/collapsible-sub:hidden" />
              <FolderOpen className="size-4 group-data-[state=closed]/collapsible-sub:hidden" />
            </CollapsibleTrigger>
            <Link
              className='min-w-0 inline-flex grow'
              onClick={() => setOpenMobile(false)}
              href={getProjectUrl(project)}
            >
              <span className='truncate'>{project.name}</span>
            </Link>
          </div>
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub className={cn('mr-0 pr-0 px-0 pt-1 border-0', !chats.length && 'hidden')}>
            {chats.map((chat) => (
              <ChatListItem
                variant='sidebar'
                chat={chat}
                onEdit={onChatEdit}
                onDelete={onChatDelete}
                onSettings={onChatSettings}
                isActive={chat.id === activeChatId}
                isEdit={activeChatEditId === chat}
                key={chat.id}
              />
            ))}
            {hasMore && (
              <SidebarMenuItem>
                <SidebarMenuButton size='sm' className="text-sidebar-foreground/70" asChild>
                  <Link href={getProjectUrl(project)}>
                    <span>See All</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Settings className="text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant='destructive' onClick={() => onDelete(project)}>
              <Trash2 className="text-muted-foreground" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </Collapsible>
  )
}
