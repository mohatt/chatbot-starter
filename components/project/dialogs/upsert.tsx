import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUpsertProjectMutation } from '@/api/mutations/projects'
import { generateUUID, getProjectUrl } from '@/lib/util'
import { toast } from 'sonner'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldError,
} from '@/components/ui/field'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { CircleAlert } from 'lucide-react'
import type { ChatProjectRecord } from '@/lib/db'

export interface ProjectUpsertDialogProps extends BaseDialogProps {
  project: ChatProjectRecord | null;
}

export function ProjectUpsertDialog(props: ProjectUpsertDialogProps) {
  const { project, open, onOpenChange } = props;
  const [name, setName] = useState(project?.name ?? '');
  const [prompt, setPrompt] = useState(project?.prompt ?? '');
  const { data, mutate, reset, error, isPending } = useUpsertProjectMutation()
  const router = useRouter()

  // handle project object updated due to cache invalidation
  useEffect(() => {
    setName(project?.name ?? '')
    setPrompt(project?.prompt ?? '')
    reset()
  }, [project, reset])

  const handleSubmit = () => {
    if(isPending) return

    mutate(
      {
        id: project?.id ?? generateUUID(),
        name,
        prompt,
        files: [],
        deleteFiles: [],
        create: !project,
      },
      {
        onSuccess: (result) => {
          if (result.data) {
            onOpenChange(false)
            if(!project) {
              router.push(getProjectUrl(result.data))
            }
            setTimeout(() => {
              toast.success(`Project ${project ? 'updated' : 'added'} successfully.`)
              if (result.errors.length) {
                result.errors.forEach(({ field, message }) => {
                  toast.warning(`${field}: ${message}`)
                })
              }
            }, 100);
            return
          }
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      title={project ? 'Edit Project' : 'New Project'}
      description={project ? 'Update project settings' : 'Create a new project'}
      submit='Save'
      error={error && 'Failed to save project.'}
      isPending={isPending}
      isReady={!!name.trim() && (name.trim() !== project?.name || prompt.trim() !== (project?.prompt ?? ''))}
    >
      <FieldGroup>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name *</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Enter Project Name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prompt">Instructions</FieldLabel>
              <FieldDescription>
                How can the chat bot best help you with this project?
              </FieldDescription>
              <Textarea
                id="prompt"
                value={prompt}
                placeholder="e.g. “Respond in Spanish. Reference the latest JavaScript documentation. Keep answers short and focused."
                onChange={e => setPrompt(e.target.value)}
                className="min-h-50"
              />
              {!project && (
                <Alert className='text-muted-foreground'>
                  <CircleAlert className='size-4' />
                  <AlertTitle>Files can later be added to this project.</AlertTitle>
                </Alert>
              )}
            </Field>
          </FieldGroup>
          {data && !data.data && data?.errors.length && (
            <FieldGroup>
              <Field>
                <FieldLabel>Errors</FieldLabel>
                <FieldError errors={data.errors} />
              </Field>
            </FieldGroup>
          )}
        </FieldSet>
      </FieldGroup>
    </FormDialog>
  )
}

export function useProjectUpsertDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [project, setProject] = useState<ChatProjectRecord | null>(null)

  return {
    open: useCallback((target: ChatProjectRecord | null) => {
      setProject(target)
      open()
    }, [open]),
    close,
    render: () => (
      <ProjectUpsertDialog
        key={key}
        open={isOpen}
        onOpenChange={setIsOpen}
        project={project}
      />
    )
  }
}
