'use client';
import { useState, type KeyboardEvent } from 'react'
import { useUpdateChatMutation } from '@/api/hooks/chats'
import { toast } from 'sonner'
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import {
  Share,
  Trash2,
  PencilLine,
} from 'lucide-react'
import { ChatTitle } from './title'
import { getChatUrl } from '@/lib/util'
import type { ChatRecord } from '@/lib/db'
import {
  DefaultVariant,
  SidebarVariant,
  DefaultEditVariant,
  SidebarEditVariant,
} from './variants'

export interface ChatListItemProps {
  chat: ChatRecord;
  onEdit: (chat: ChatRecord | null) => void;
  onDelete: (chat: ChatRecord) => void;
  onSettings: (chat: ChatRecord) => void;
  isActive?: boolean;
  isEdit?: boolean;
  variant?: 'sidebar' | 'item';
}

export function ChatListItem(props: ChatListItemProps) {
  const { chat, onEdit, onDelete, onSettings, isActive, isEdit, variant = 'sidebar' } = props

  if (isEdit) {
    return (
      <ChatListItemEdit
        chat={chat}
        onClose={() => onEdit(null)}
        variant={variant}
      />
    )
  }

  const Comp = variant === 'sidebar' ? SidebarVariant : DefaultVariant
  return (
    <Comp
      isActive={isActive}
      href={getChatUrl(chat)}
      onDoubleClick={() => onEdit(chat)}
      title={<ChatTitle chat={chat} />}
      menu={(
        <>
          <DropdownMenuItem onClick={() => onEdit(chat)}>
            <PencilLine className="text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem  onClick={() => onSettings(chat)}>
            <Share className="text-muted-foreground" />
            <span>Share</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => onDelete(chat)}>
            <Trash2 className="text-muted-foreground" />
            <span>Delete</span>
          </DropdownMenuItem>
        </>
      )}
    />
  )
}

interface ChatListItemEditProps {
  chat: ChatRecord;
  onClose: () => void;
  variant: 'sidebar' | 'item';
}

function ChatListItemEdit({ chat, onClose, variant }: ChatListItemEditProps) {
  const { mutate, isPending } = useUpdateChatMutation()
  const [inputValue, setInputValue] = useState(chat.title);

  const handleCancel = () => {
    if (isPending) return
    onClose()
  }

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text || text === chat.title) {
      handleCancel()
      return
    }

    mutate(
      { id: chat.id, title: text },
      {
        onSettled: onClose,
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const Comp = variant === 'sidebar' ? SidebarEditVariant : DefaultEditVariant
  return (
    <Comp
      name={`chat-title-${chat.id}`}
      value={inputValue}
      className='focus-visible:ring-0'
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSubmit}
      onFocus={(e) => e.target.select()}
      isPending={isPending}
      disabled={isPending}
      autoFocus
    />
  )
}
