import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteChatsMutation } from '@/api/hooks/chats'
import { useAppParams } from '@/hooks/use-app-params'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatProjectRecord } from '@/lib/db'

export interface DeleteAllChatsDialogProps extends BaseDialogProps {
  project: Pick<ChatProjectRecord, 'id' | 'name'> | null
}

export function DeleteAllChatsDialog(props: DeleteAllChatsDialogProps) {
  const { open, onOpenChange, project } = props
  const { mutate, error, isPending } = useDeleteChatsMutation()
  const router = useRouter()
  const { activeProjectId, activeChatId } = useAppParams()
  const projectId = project?.id ?? null

  const handleDelete = useCallback(() => {
    mutate(
      { projectId },
      {
        onSuccess: () => {
          onOpenChange(false)
          if (activeChatId) {
            if (projectId) {
              if (activeProjectId === projectId) {
                router.replace(`/project/${projectId}`)
              }
            } else {
              router.replace('/')
            }
          }
          setTimeout(() => {
            toast.success('All chats deleted successfully.')
          }, 100)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }, [activeChatId, activeProjectId, mutate, onOpenChange, projectId, router])

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleDelete}
      title='Delete all chats?'
      description={
        <>
          This will delete <b>all your chats</b>{' '}
          {project ? (
            <>
              under <b>{project.name}</b> project
            </>
          ) : (
            ''
          )}
          .
        </>
      }
      submit='Delete All'
      variant='destructive'
      error={error && 'Failed to delete all chats.'}
      isPending={isPending}
    >
      <Alert variant='destructive'>
        <CircleAlert />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          <p>
            This will permanently delete all your chats{' '}
            {project ? (
              <>
                under <b>{project.name}</b> project{' '}
              </>
            ) : (
              ''
            )}
            and their history from our servers. This action cannot be undone.
          </p>
        </AlertDescription>
      </Alert>
    </AlertDialog>
  )
}

export function useDeleteAllChatsDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [project, setProject] = useState<DeleteAllChatsDialogProps['project']>(null)

  return {
    open: useCallback(
      (targetProject: DeleteAllChatsDialogProps['project'] = null) => {
        setProject(targetProject)
        open()
      },
      [open],
    ),
    close,
    render: () => (
      <DeleteAllChatsDialog key={key} open={isOpen} onOpenChange={setIsOpen} project={project} />
    ),
  }
}
