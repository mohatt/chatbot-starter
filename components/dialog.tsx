import { type ReactNode, useCallback, useId, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog as BaseAlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { LoadingDots } from '@/components/loading'
import { CircleAlert } from 'lucide-react'

export interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface ComposedDialogProps extends BaseDialogProps {
  title: string
  onSubmit: () => void | Promise<void>
  description?: ReactNode
  children?: ReactNode
  submit?: string
  cancel?: string
  error?: string | null
  isPending?: boolean
  isReady?: boolean
}

export interface AlertDialogProps extends ComposedDialogProps {
  variant?: 'destructive' | 'default'
}

export function AlertDialog(props: AlertDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    submit = 'Ok',
    cancel = 'Cancel',
    children,
    onSubmit,
    variant,
    error,
    isPending,
    isReady = true,
  } = props
  return (
    <BaseAlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children && <div data-slot='alert-dialog-body'>{children}</div>}
        <AlertDialogFooter className='sm:items-center'>
          {error && (
            <div className='flex items-center gap-2 grow text-sm text-destructive'>
              <CircleAlert className='size-4' />
              <span className='w-full'>{error}</span>
            </div>
          )}
          {cancel && (
            <AlertDialogCancel disabled={isPending}>
              {cancel}
              <Kbd className='not-md:hidden'>Esc</Kbd>
            </AlertDialogCancel>
          )}
          <Button
            type='button'
            variant={variant}
            disabled={isPending || !isReady}
            onClick={onSubmit}
          >
            {isPending && <LoadingDots />}
            {submit}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </BaseAlertDialog>
  )
}

export interface FormDialogProps extends ComposedDialogProps {}

export function FormDialog(props: FormDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    submit = 'Save',
    cancel = 'Cancel',
    children,
    onSubmit,
    error,
    isPending,
    isReady = true,
  } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div data-slot='dialog-body'>{children}</div>
        <DialogFooter className='sm:items-center'>
          {error && (
            <div className='flex items-center gap-2 grow text-sm text-destructive'>
              <CircleAlert className='size-4' />
              <span className='w-full'>{error}</span>
            </div>
          )}
          {cancel && (
            <DialogClose asChild>
              <Button type='button' variant='outline' disabled={isPending}>
                {cancel}
              </Button>
            </DialogClose>
          )}
          <Button type='button' disabled={isPending || !isReady} onClick={onSubmit}>
            {isPending && <LoadingDots />}
            {submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function useDialogState() {
  const id = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [key, setKey] = useState(0)

  const open = useCallback(() => {
    setIsOpen(true)
    setKey((prev) => prev + 1)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    id,
    isOpen,
    setIsOpen,
    key: `${id}-${key}`,
    open,
    close,
  }
}
