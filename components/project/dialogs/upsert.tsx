import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateProjectMutation, useUpdateProjectMutation } from '@/api-client/hooks/projects'
import { useUserBilling } from '@/hooks/use-user-billing'
import { useSidebar } from '@/components/ui/sidebar'
import { generateUUID, getProjectUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormDialog, AlertDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { CircleAlert } from 'lucide-react'
import { AppError } from '@/lib/errors'
import type { ChatProjectRecord } from '@/lib/db'

export interface ProjectUpsertDialogProps extends BaseDialogProps {
  project: ChatProjectRecord | null
}

export function ProjectUpsertDialog(props: ProjectUpsertDialogProps) {
  const { project, open, onOpenChange } = props
  const [name, setName] = useState(project?.name ?? '')
  const [prompt, setPrompt] = useState(project?.prompt ?? '')
  const { hasNoProjectQuota } = useUserBilling()
  const isCreateLimitReached = !project && hasNoProjectQuota
  const createMutation = useCreateProjectMutation()
  const updateMutation = useUpdateProjectMutation()
  const { mutateAsync, reset, error, isPending } = project ? updateMutation : createMutation
  const { setOpenMobile } = useSidebar()
  const router = useRouter()

  // handle project object updated due to cache invalidation
  useEffect(() => {
    setName(project?.name ?? '')
    setPrompt(project?.prompt ?? '')
    reset()
  }, [project, reset])

  const handleSubmit = () => {
    if (isPending || isCreateLimitReached) return

    mutateAsync({
      id: project?.id ?? generateUUID(),
      name,
      prompt,
    })
      .then((result) => {
        onOpenChange(false)
        if (!project) {
          router.push(getProjectUrl(result))
        }
        setTimeout(() => {
          if (!project) {
            // New project dialogs are opened from the sidebar
            setOpenMobile(false)
          }
          toast.success(`Project ${project ? 'updated' : 'added'} successfully.`)
        }, 100)
      })
      .catch((err: AppError) => {
        toast.error(err.message)
      })
  }

  if (isCreateLimitReached) {
    return (
      <AlertDialog
        open={open}
        onOpenChange={onOpenChange}
        title='Error'
        description='Project quota reached'
        cancel='Close'
      >
        <Alert variant='destructive'>
          <CircleAlert />
          <AlertDescription>{new AppError('rate_limit:project').message}</AlertDescription>
        </Alert>
      </AlertDialog>
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      title={project ? 'Edit project' : 'New project'}
      description={project ? 'Update project settings' : 'Create a new project'}
      submit='Save'
      error={error && 'Failed to save project.'}
      isPending={isPending}
      isReady={
        !isCreateLimitReached &&
        !!name.trim() &&
        (name.trim() !== project?.name || prompt.trim() !== (project?.prompt ?? ''))
      }
    >
      <FieldGroup>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>Name *</FieldLabel>
              <Input
                id='name'
                type='text'
                placeholder='Enter project name'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='prompt'>Instructions</FieldLabel>
              <FieldDescription>
                How can the chat bot best help you with this project?
              </FieldDescription>
              <Textarea
                id='prompt'
                value={prompt}
                placeholder='e.g. “Respond in Spanish. Reference the latest JavaScript documentation. Keep answers short and focused.'
                onChange={(e) => setPrompt(e.target.value)}
                className='min-h-50'
              />
              {!project && (
                <Alert className='text-muted-foreground'>
                  <CircleAlert />
                  <AlertTitle>Files can later be added to this project.</AlertTitle>
                </Alert>
              )}
            </Field>
          </FieldGroup>
        </FieldSet>
      </FieldGroup>
    </FormDialog>
  )
}

export function useProjectUpsertDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [project, setProject] = useState<ChatProjectRecord | null>(null)

  return {
    open: useCallback(
      (target: ChatProjectRecord | null) => {
        setProject(target)
        open()
      },
      [open],
    ),
    close,
    render: () => (
      <ProjectUpsertDialog key={key} open={isOpen} onOpenChange={setIsOpen} project={project} />
    ),
  }
}
