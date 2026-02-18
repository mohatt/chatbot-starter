import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteProjectsMutation } from '@/api-client/hooks/projects'
import { useAppParams } from '@/hooks/use-app-params'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'

export interface DeleteAllProjectsDialogProps extends BaseDialogProps {}

export function DeleteAllProjectsDialog(props: DeleteAllProjectsDialogProps) {
  const { open, onOpenChange } = props
  const { mutate, error, isPending } = useDeleteProjectsMutation()
  const { activeProjectId } = useAppParams()
  const router = useRouter()

  const handleDelete = useCallback(() => {
    mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false)
        if (activeProjectId) {
          router.replace('/')
        }
        setTimeout(() => {
          toast.success('All projects deleted successfully.')
        }, 100)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }, [activeProjectId, mutate, onOpenChange, router])

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleDelete}
      title='Delete all projects?'
      description={
        <>
          This will delete <b>all your projects</b>.
        </>
      }
      submit='Delete All'
      variant='destructive'
      error={error && 'Failed to delete all projects.'}
      isPending={isPending}
    >
      <Alert variant='destructive' className='mt-1'>
        <CircleAlert />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          <p>
            This will permanently delete all your projects and their chats from our servers. This
            action cannot be undone.
          </p>
        </AlertDescription>
      </Alert>
    </AlertDialog>
  )
}

export function useDeleteAllProjectsDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  return {
    open,
    close,
    render: () => <DeleteAllProjectsDialog key={key} open={isOpen} onOpenChange={setIsOpen} />,
  }
}
