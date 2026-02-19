'use client'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Loader2Icon, PaperclipIcon, XIcon } from 'lucide-react'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { ClientUpload } from '@/hooks/use-file-upload'

export interface PromptAttachmentProps {
  file: ClientUpload<string>
  onRemove: (id: string) => void
  className?: string
}

export function PromptAttachment(props: PromptAttachmentProps) {
  const { file, onRemove, className } = props
  const url = file.url ?? file.previewUrl ?? ''
  const isImage = file.mimeType.startsWith('image/')
  const isPending = file.status === 'idle' || file.status === 'pending'

  return (
    <HoverCard closeDelay={0} openDelay={0}>
      <HoverCardTrigger asChild>
        <div
          key={file.id}
          className={cn(
            'group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
            file.error != null && 'border-destructive/70 text-destructive',
            className,
          )}
        >
          <div className='relative size-5 shrink-0'>
            <div className='absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity group-hover:opacity-0'>
              {isImage ? (
                <Image
                  alt={file.name || 'Attachment'}
                  className='size-5 object-cover'
                  src={url}
                  width={20}
                  height={20}
                  loading='eager'
                  unoptimized
                />
              ) : (
                <div className='flex size-5 items-center justify-center text-muted-foreground'>
                  <PaperclipIcon className='size-3' />
                </div>
              )}
            </div>
            {isPending ? (
              <div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-background/80'>
                <Loader2Icon className='size-3 animate-spin text-foreground' />
              </div>
            ) : (
              <Button
                aria-label='Remove attachment'
                className='absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5'
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(file.id)
                }}
                type='button'
                variant='ghost'
              >
                <XIcon />
                <span className='sr-only'>Remove</span>
              </Button>
            )}
          </div>

          <span className='flex-1 truncate'>{file.name || (isImage ? 'Image' : 'Attachment')}</span>
          {file.error != null && <span className='text-destructive text-xs'>Failed</span>}
        </div>
      </HoverCardTrigger>
      <HoverCardContent align='start' className='w-auto p-2'>
        <div className='w-auto space-y-3'>
          {isImage && (
            <div className='flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border'>
              <Image
                alt={file.name || 'Attachment preview'}
                className='max-h-full max-w-full object-contain'
                src={url}
                width={320}
                height={384}
                loading='eager'
                placeholder={config.uploads.images.placeholder}
                unoptimized
              />
            </div>
          )}
          <div className='flex items-center gap-2.5'>
            <div className='min-w-0 flex-1 space-y-1 px-0.5'>
              <h4 className='truncate font-semibold text-sm leading-none'>
                {file.name || (isImage ? 'Image' : 'Attachment')}
              </h4>
              <p className='truncate font-mono text-muted-foreground text-xs'>{file.mimeType}</p>
              {file.error != null && <p className='text-destructive text-xs'>{file.error}</p>}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
