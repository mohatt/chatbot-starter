import { useCallback, useId, useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogMedia,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog as RadixAlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { LoadingDots } from '@/components/loading'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface ComposedDialogProps extends BaseDialogProps {
  title: string
  description?: ReactNode
  children?: ReactNode
  media?: ReactNode
  submit?: string
  cancel?: string
  error?: string | null
  isPending?: boolean
  isReady?: boolean
  className?: string
}

export interface ConfirmDialogProps extends ComposedDialogProps {
  variant?: 'default' | 'destructive'
  size?: 'default' | 'sm'
  onSubmit?: () => void | Promise<void>
}

export function ConfirmDialog(props: ConfirmDialogProps) {
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
    size,
    media,
    error,
    isPending,
    isReady = true,
    className,
  } = props
  return (
    <RadixAlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size={size} className={className}>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              variant === 'destructive' &&
                'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
            )}
          >
            {media ?? <CircleAlert />}
          </AlertDialogMedia>
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
          {onSubmit && (
            <Button
              type='button'
              variant={variant}
              disabled={isPending || !isReady}
              onClick={onSubmit}
            >
              {isPending && <LoadingDots />}
              {submit}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </RadixAlertDialog>
  )
}

export interface AlertDialogProps extends BaseDialogProps {
  title: string
  description?: ReactNode
  children?: ReactNode
  media?: ReactNode
  variant?: 'default' | 'destructive'
  className?: string
}

export function AlertDialog(props: AlertDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    children,
    variant = 'default',
    media,
    className,
  } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogMedia
            className={cn(
              variant === 'destructive' &&
                'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
            )}
          >
            {media ?? <CircleAlert />}
          </DialogMedia>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className='sr-only'>{description}</DialogDescription>}
        </DialogHeader>
        <div data-slot='dialog-body' className='flex flex-col gap-2'>
          <Alert variant={variant}>
            <CircleAlert />
            <AlertTitle>{description}</AlertTitle>
          </Alert>
          {children && <div className='text-sm'>{children}</div>}
        </div>
        <DialogFooter className='sm:items-center'>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Close
              <Kbd className='not-md:hidden'>Esc</Kbd>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export interface FormDialogProps extends ComposedDialogProps {
  onSubmit: () => void | Promise<void>
}

export function FormDialog(props: FormDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    media,
    submit = 'Save',
    cancel = 'Cancel',
    children,
    onSubmit,
    error,
    isPending,
    isReady = true,
    className,
  } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-3xl', className)}>
        <DialogHeader>
          {media && <DialogMedia>{media}</DialogMedia>}
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
