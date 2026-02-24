import { useCallback, useEffect, useState, useRef } from 'react'
import { useFileUpload, type ClientUpload } from '@/hooks/use-file-upload'
import { useUserBilling } from '@/hooks/use-user-billing'
import { useFilesQuery, useDeleteFileMutation } from '@/api-client/hooks/files'
import { useDialogState, type BaseDialogProps } from '@/components/dialog'
import { formatFileSize, cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogMedia,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingDots } from '@/components/loading'
import {
  FilesIcon,
  FileTextIcon,
  FilePlusCorner,
  DownloadIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { config } from '@/lib/config'
import type { ChatProjectRecord, FileRecord } from '@/lib/db'
import type { AppError } from '@/lib/errors'
import Link from 'next/link'
import Image from 'next/image'

export interface ProjectFilesDialogProps extends BaseDialogProps {
  project: ChatProjectRecord
}

export function ProjectFilesDialog(props: ProjectFilesDialogProps) {
  const { project, open, onOpenChange } = props
  const projectId = project.id
  const {
    data: dbFiles,
    isLoading: dbFilesLoading,
    error: dbFilesError,
  } = useFilesQuery({
    variables: { projectId },
    enabled: open,
  })
  const dbFilesRef = useRef(new Map<string, FileRecord>())
  const { mutateAsync: deleteDbFile } = useDeleteFileMutation()
  const { data: billing } = useUserBilling()
  const maxProjectFiles = billing?.tierConfig.maxProjectFiles ?? 0

  const { files, upsertFile, updateFile, renderUpload, openFileDialog, removeFile, hasMaxFiles } =
    useFileUpload({
      enabled: maxProjectFiles > 0,
      limit: maxProjectFiles,
      buckets: ['retrieval', 'images'],
      metadata: { namespace: 'project', projectId },
    })
  const isUploadDisabled = hasMaxFiles || maxProjectFiles <= 0

  useEffect(() => {
    dbFilesRef.current.clear()
    if (!dbFiles) return

    for (const dbFile of dbFiles) {
      const { id, bucket, name, size, mimeType, url, metadata, createdAt } = dbFile
      upsertFile({
        id,
        name,
        size,
        mimeType,
        bucket: bucket as any,
        status: 'uploaded',
        error: null,
        url,
        metadata,
        createdAt,
      })
      dbFilesRef.current.set(id, dbFile)
    }
  }, [dbFiles, upsertFile])

  const handleDelete = useCallback(
    (id: string) => {
      updateFile(id, { status: 'pending' })
      deleteDbFile({ id })
        .then(() => removeFile(id))
        .catch((err: AppError) => updateFile(id, { status: 'error', error: err.message }))
    },
    [deleteDbFile, updateFile, removeFile],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='px-0 sm:max-w-3xl' showCloseButton={false}>
        <DialogHeader className='px-6 flex flex-row items-center justify-between gap-4'>
          <DialogMedia>
            <FilesIcon />
          </DialogMedia>
          <div className='text-left grow'>
            <DialogTitle>Project files {files.length > 0 && `(${files.length})`}</DialogTitle>
            <DialogDescription className='sr-only'>Manage project files</DialogDescription>
          </div>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => openFileDialog()}
              disabled={isUploadDisabled}
            >
              <FilePlusCorner />
              <span>Add files</span>
            </Button>
            <DialogClose asChild>
              <Button type='button' variant='ghost' size='sm'>
                <XIcon />
                <span className='sr-only'>Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        {renderUpload(
          <div
            className={cn(
              'flex flex-col items-center justify-center min-h-[40vh] max-h-[80vh]',
              !files.length && 'mx-6 border border-border/70 rounded-lg',
            )}
          >
            {dbFilesLoading ? (
              <LoadingDots className='text-3xl' />
            ) : dbFilesError ? (
              <p className='text-sm text-destructive text-center'>
                Unable to load project files
                <br />
                {dbFilesError.message}
              </p>
            ) : files.length === 0 ? (
              <Button
                type='button'
                variant='ghost'
                size='lg'
                className='size-full flex-col whitespace-normal'
                onClick={() => openFileDialog()}
                disabled={isUploadDisabled}
              >
                <FilePlusCorner className='size-6' />
                <span>
                  Add files so <strong>{project.name}</strong> can access their contents when you
                  chat inside the project.
                </span>
              </Button>
            ) : (
              <ScrollArea className='size-full px-6'>
                <ItemGroup className='gap-3 w-full'>
                  {files.map((file) => (
                    <ProjectFileItem
                      key={file.id}
                      file={file}
                      dbFile={dbFilesRef.current.get(file.id)}
                      onDelete={handleDelete}
                    />
                  ))}
                </ItemGroup>
              </ScrollArea>
            )}
          </div>,
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ProjectFileItemProps {
  file: ClientUpload<string>
  dbFile?: FileRecord
  onDelete: (id: string) => void
}

function ProjectFileItem(props: ProjectFileItemProps) {
  const { file, onDelete } = props
  const isPending = file.status === 'pending'
  const isImage = file.mimeType.startsWith('image/')
  return (
    <Item
      size='sm'
      variant='outline'
      className={isPending ? 'bg-accent/50 animate-pulse' : 'hover:bg-accent/50'}
    >
      {isImage ? (
        <ItemMedia variant='image'>
          <Image
            src={file.url ?? file.previewUrl ?? ''}
            alt={file.name}
            width={96}
            height={96}
            loading='eager'
            placeholder={config.uploads.images.placeholder}
            unoptimized
          />
        </ItemMedia>
      ) : (
        <ItemMedia variant='icon'>
          <FileTextIcon />
        </ItemMedia>
      )}
      <ItemContent>
        <ItemTitle>
          <span className='truncate'>{file.name}</span>
        </ItemTitle>
        <ItemDescription>
          {file.error != null ? (
            <span className='text-destructive'>{file.error}</span>
          ) : (
            <>
              {isImage ? 'Image' : 'Document'} · {formatFileSize(file.size)}
            </>
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {file.url && !isPending && (
          <Button
            asChild
            variant='outline'
            size='icon-sm'
            title='Download file'
            aria-label='Download file'
            className='pointer-fine:opacity-0 md:opacity-100 group-hover/item:opacity-100 group-focus-within/item:opacity-100'
          >
            <Link href={file.url} target='_blank' rel='noopener noreferrer'>
              <DownloadIcon className='size-4' />
            </Link>
          </Button>
        )}
        {isPending ? (
          <span className='inline-flex items-center font-medium size-8 px-2'>
            <LoadingDots className='text-lg' />
            <span className='sr-only'>In progress</span>
          </span>
        ) : (
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            onClick={() => onDelete(file.id)}
            title='Remove file'
            aria-label='Remove file'
            className='pointer-fine:opacity-0 md:opacity-100 group-hover/item:opacity-100 group-focus-within/item:opacity-100'
          >
            <Trash2Icon className='size-4' />
          </Button>
        )}
      </ItemActions>
    </Item>
  )
}

export function useProjectFilesDialog() {
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
        <ProjectFilesDialog key={key} open={isOpen} onOpenChange={setIsOpen} project={project} />
      ),
  }
}
