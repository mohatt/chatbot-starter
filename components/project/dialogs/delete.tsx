import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteProjectMutation } from '@/api-client/hooks/projects'
import { useAppParams } from '@/hooks/use-app-params'
import { ConfirmDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { CircleAlert } from 'lucide-react'
import type { ChatProjectRecord } from '@/lib/db'

export interface DeleteProjectDialogProps extends BaseDialogProps {
  project: ChatProjectRecord
}

export function DeleteProjectDialog(props: DeleteProjectDialogProps) {
  const { project, open, onOpenChange } = props
  const { mutate, error, isPending } = useDeleteProjectMutation()
  const { activeProjectId } = useAppParams()
  const router = useRouter()
  const { id, name } = project

  const handleDelete = useCallback(() => {
    mutate(
      { id },
      {
        onSuccess: () => {
          onOpenChange(false)
          if (activeProjectId === id) {
            router.replace('/')
          }
          setTimeout(() => {
            toast.success('Project deleted successfully.')
          }, 100)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }, [activeProjectId, id, mutate, onOpenChange, router])

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleDelete}
      title='Delete project?'
      description={
        <>
          This will delete <b>{name}</b> project.
        </>
      }
      submit='Delete'
      variant='destructive'
      error={error && 'Failed to delete project.'}
      isPending={isPending}
    >
      <Alert variant='destructive'>
        <CircleAlert />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          <p>
            This will also permanently delete any chats under this project and their history from
            our servers. This action cannot be undone.
          </p>
        </AlertDescription>
      </Alert>
    </ConfirmDialog>
  )
}

export function useDeleteProjectDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [project, setProject] = useState<ChatProjectRecord | null>(null)

  return {
    open: useCallback(
      (target: ChatProjectRecord) => {
        setProject(target)
        open()
      },
      [open],
    ),
    close,
    render: () =>
      project !== null && (
        <DeleteProjectDialog key={key} open={isOpen} onOpenChange={setIsOpen} project={project} />
      ),
  }
}
