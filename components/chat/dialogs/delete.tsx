import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteChatMutation } from '@/api-client/hooks/chats'
import { useAppParams } from '@/hooks/use-app-params'
import { ConfirmDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { toast } from 'sonner'
import { Trash2Icon } from 'lucide-react'
import type { ChatRecord } from '@/lib/db'

export interface DeleteChatDialogProps extends BaseDialogProps {
  chat: ChatRecord
}

export function DeleteChatDialog(props: DeleteChatDialogProps) {
  const { open, chat, onOpenChange } = props
  const { mutate, error, isPending } = useDeleteChatMutation()
  const router = useRouter()
  const { activeChatId } = useAppParams()
  const { id, title, projectId } = chat

  const handleDelete = useCallback(() => {
    mutate(
      { id },
      {
        onSuccess: () => {
          onOpenChange(false)
          if (activeChatId === id) {
            const fallback = projectId ? `/project/${projectId}` : '/'
            router.replace(fallback)
          }
          setTimeout(() => {
            toast.success('Chat deleted successfully.')
          }, 100)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }, [id, projectId, activeChatId, mutate, onOpenChange, router])

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleDelete}
      title='Delete chat?'
      description={
        <>
          This will delete <b>{title}</b>.
        </>
      }
      size='sm'
      media={<Trash2Icon />}
      submit='Delete'
      variant='destructive'
      error={error && 'Failed to delete chat.'}
      isPending={isPending}
    />
  )
}

export function useDeleteChatDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [chat, setChat] = useState<ChatRecord | null>(null)

  return {
    open: useCallback(
      (target: ChatRecord) => {
        open()
        setChat(target)
      },
      [open],
    ),
    close,
    render: () =>
      chat !== null && (
        <DeleteChatDialog key={key} open={isOpen} onOpenChange={setIsOpen} chat={chat} />
      ),
  }
}
