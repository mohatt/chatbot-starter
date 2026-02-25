'use client'
import { useMemo, useState } from 'react'
import { useProjectQuery } from '@/api-client/hooks/projects'
import { useChatsQuery } from '@/api-client/hooks/chats'
import { useFilesQuery } from '@/api-client/hooks/files'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePageTitle } from '@/hooks/use-page-title'
import { Item, ItemActions, ItemTitle } from '@/components/ui/item'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConversationEmptyState } from '@/components/ai-elements/conversation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingDots } from '@/components/loading'
import {
  FolderClosed,
  FilesIcon,
  FilePlusCorner,
  MoreHorizontal,
  Trash2,
  Settings,
  CircleAlert,
} from 'lucide-react'
import { ChatListItem } from '@/components/chat/list-item'
import { useChatSettingsDialog } from '@/components/chat/dialogs/settings'
import { useDeleteChatDialog } from '@/components/chat/dialogs/delete'
import { useDeleteAllChatsDialog } from '@/components/chat/dialogs/delete-all'
import { useDeleteProjectDialog } from './dialogs/delete'
import { useProjectUpsertDialog } from './dialogs/upsert'
import { useProjectFilesDialog } from './dialogs/files'
import type { NewChatChildProps } from '@/components/chat/new-chat'
import type { ChatRecord } from '@/lib/db'

export interface ProjectIndexProps extends Pick<NewChatChildProps, 'sendMessage'> {
  id: string
}

export function ProjectIndex({ id }: ProjectIndexProps) {
  const isMobile = useIsMobile()
  const deleteDialog = useDeleteProjectDialog()
  const upsertDialog = useProjectUpsertDialog()
  const filesDialog = useProjectFilesDialog()
  const deleteAllChatsDialog = useDeleteAllChatsDialog()
  const chatSettingsDialog = useChatSettingsDialog()
  const deleteChatDialog = useDeleteChatDialog()
  const [chatTitleEditor, setChatTitleEditor] = useState<ChatRecord | null>(null)

  const {
    data: project,
    error: projectError,
    isLoading: projectLoading,
  } = useProjectQuery({
    variables: { id },
  })
  const {
    data: files,
    error: filesError,
    isLoading: filesLoading,
  } = useFilesQuery({
    variables: { projectId: id },
  })
  const {
    data: chatsData,
    error: chatsError,
    isLoading: chatsLoading,
  } = useChatsQuery({
    variables: { projectId: id },
  })
  const chats = useMemo(() => chatsData?.pages.flatMap((page) => page.data) ?? [], [chatsData])
  const isDataLoading = projectLoading || chatsLoading
  const dataError = projectError || filesError || chatsError

  usePageTitle({ title: project?.name })

  if (isDataLoading) {
    return (
      <ConversationEmptyState>
        <LoadingDots className='text-4xl' />
      </ConversationEmptyState>
    )
  }

  if (dataError || !project || !chatsData) {
    return (
      <ConversationEmptyState
        className='text-destructive'
        icon={<CircleAlert className='text-destructive' />}
        title='Unable to load project data.'
        description={dataError?.message}
      />
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='w-full mx-auto max-w-4xl px-4'>
        <Item className='px-0' variant='default'>
          <ItemTitle className='flex-1 min-w-0 text-2xl'>
            <FolderClosed className='shrink-0' />
            <button
              name='project-title'
              aria-label='Edit the title of this project'
              className='min-w-0 truncate'
              onClick={() => upsertDialog.open(project!)}
            >
              {project.name}
            </button>
          </ItemTitle>
          <DropdownMenu>
            <ItemActions>
              {files?.length ? (
                <Button variant='outline' onClick={() => filesDialog.open(project)}>
                  <FilesIcon />
                  <span>Files</span>
                  <Badge className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums'>
                    {files.length}
                  </Badge>
                </Button>
              ) : (
                <Button
                  variant='outline'
                  onClick={() => filesDialog.open(project)}
                  disabled={filesLoading}
                >
                  {filesLoading ? <LoadingDots /> : <FilePlusCorner />}
                  <span>{filesLoading ? 'Files' : 'Add files'}</span>
                </Button>
              )}
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='icon'>
                  <MoreHorizontal />
                  <span className='sr-only'>More</span>
                </Button>
              </DropdownMenuTrigger>
            </ItemActions>
            <DropdownMenuContent
              className='w-44 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align={isMobile ? 'end' : 'start'}
            >
              <DropdownMenuItem onClick={() => upsertDialog.open(project)}>
                <Settings className='text-muted-foreground' />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => deleteAllChatsDialog.open(project)}
              >
                <Trash2 className='text-muted-foreground' />
                <span>Delete all chats</span>
              </DropdownMenuItem>
              <DropdownMenuItem variant='destructive' onClick={() => deleteDialog.open(project)}>
                <Trash2 className='text-muted-foreground' />
                <span>Delete project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Item>
      </div>
      <div className='h-full overflow-y-auto'>
        <div className='flex flex-col gap-2 mx-auto max-w-4xl px-4'>
          {chats.map((chat) => (
            <ChatListItem
              chat={chat}
              onEdit={setChatTitleEditor}
              onDelete={deleteChatDialog.open}
              onSettings={chatSettingsDialog.open}
              isEdit={chatTitleEditor === chat}
              key={chat.id}
              variant='item'
            />
          ))}
          {chats.length === 0 && (
            <div className='text-muted-foreground text-xl'>
              Chats in this project will appear here.
            </div>
          )}
        </div>
      </div>
      {filesDialog.render()}
      {upsertDialog.render()}
      {deleteDialog.render()}
      {deleteChatDialog.render()}
      {chatSettingsDialog.render()}
      {deleteAllChatsDialog.render()}
    </div>
  )
}
