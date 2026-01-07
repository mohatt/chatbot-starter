import { useCallback, useEffect, useState, useRef } from 'react'
import { useFileUpload, type ClientUpload } from '@/hooks/use-file-upload'
import { useFilesQuery } from '@/api/queries/files'
import { useDeleteFileMutation } from '@/api/mutations/files'
import { useDialogState, type BaseDialogProps } from '@/components/dialog'
import { toast } from 'sonner'
import { formatFileSize } from '@/lib/util'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemContent,
  ItemDescription, ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingDots } from '@/components/loading'
import { DownloadIcon, FilePlusCorner, FileTextIcon, Loader2Icon, Trash2Icon, XIcon } from 'lucide-react'
import { config } from '@/lib/config'
import type { ChatProjectRecord, FileRecord } from '@/lib/db'
import type { AppError } from '@/lib/errors'
import Image from 'next/image'
import Link from 'next/link'

export interface ProjectFilesDialogProps extends BaseDialogProps {
  project: ChatProjectRecord;
}

export function ProjectFilesDialog(props: ProjectFilesDialogProps) {
  const { project, open, onOpenChange } = props
  const projectId = project.id
  const { data: dbFiles, isLoading: dbFilesLoading, error: dbFilesError } = useFilesQuery({
    variables: { projectId },
    enabled: open,
  })
  const dbFilesRef = useRef(new Map<string, FileRecord>())
  const { mutateAsync: deleteDbFile } = useDeleteFileMutation()

  const {
    files,
    upsertFile,
    updateFile,
    renderUpload,
    openFileDialog,
    removeFile,
    hasMaxFiles,
  } = useFileUpload({
    buckets: ['retrieval'],
    metadata: { namespace: 'project', projectId },
    limit: config.project.maxFiles,
    onError: ({ message }) => {
      toast.error(message)
    },
  })

  useEffect(() => {
    if (!dbFiles) return
    for (const dbFile of dbFiles) {
      const { id, bucket, name, size, mimeType, url } = dbFile
      upsertFile({
        id,
        name,
        size,
        mimeType,
        bucket: bucket as any,
        status: 'uploaded',
        error: null,
        url,
      })
      dbFilesRef.current.set(id, dbFile)
    }
  }, [dbFiles, upsertFile])

  const handleDelete = (id: string) => {
    updateFile(id, { status: 'uploading' })
    deleteDbFile({ id })
      .then(() => removeFile(id))
      .catch((err: AppError) => updateFile(id, { status: 'error', error: err.message }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div className="text-left grow">
            <DialogTitle>Project files {files.length > 0 && `(${files.length})`}</DialogTitle>
            <DialogDescription>
              Manage files for <strong>{project.name}</strong>.
            </DialogDescription>
          </div>
          <div className='flex gap-2'>
            <Button
              type="button"
              variant='outline'
              size='sm'
              onClick={() => openFileDialog()}
              disabled={hasMaxFiles}
            >
              <FilePlusCorner />
              <span>Add files</span>
            </Button>
            <DialogClose asChild>
              <Button type="button" variant='ghost' size='sm'>
                <XIcon />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        {renderUpload(
          <div className={cn(
            "flex flex-col items-center justify-center gap-3 min-h-[40vh] max-h-[80vh] rounded-lg",
            !files.length && 'border border-border/70',
          )}>
            {dbFilesLoading ? (
              <LoadingDots className='text-3xl' />
            ) : dbFilesError ? (
              <p className="text-sm text-destructive text-center">
                Unable to load project files<br />
                {dbFilesError.message}
              </p>
            ) : files.length === 0 ? (
              <Button
                type="button"
                variant='ghost'
                size='lg'
                className="size-full flex-col whitespace-normal cursor-pointer"
                onClick={() => openFileDialog()}
              >
                <FilePlusCorner className='size-6' />
                <span>
                  Add files so <strong>{project.name}</strong> can access their
                  contents when you chat inside the project.
                </span>
              </Button>
            ) : (
              <ScrollArea className="size-full">
                <ItemGroup className="gap-3 w-full">
                  {files.map((file) => (
                    <ProjectFileItem
                      key={file.id}
                      file={file}
                      dbFile={dbFilesRef.current.get(file.id)}
                      onDelete={() => handleDelete(file.id)}
                    />
                  ))}
                </ItemGroup>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ProjectFileItemProps {
  file: ClientUpload<string>;
  dbFile?: FileRecord;
  onDelete: () => void;
}

function ProjectFileItem(props: ProjectFileItemProps) {
  const { file, onDelete } = props
  const isPending = file.status === 'uploading'
  const isImage = file.mimeType.startsWith('image/')
  return (
    <Item variant='outline' size='sm' className='hover:bg-accent/50'>
      {isImage ? (
        <ItemMedia variant='image'>
          <Image src={file.previewUrl ?? file.url ?? ''} alt={file.name} />
        </ItemMedia>
      ) : (
        <ItemMedia variant='icon'>
          <FileTextIcon />
        </ItemMedia>
      )}

      <ItemContent>
        <ItemTitle>
          <span className="truncate">
            {file.name}
          </span>
        </ItemTitle>
        <ItemDescription>
          {isImage ? 'Image' : 'Document'} · {formatFileSize(file.size)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {file.url && (
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            title="Download"
            aria-label="Download file"
            className={isPending ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          >
            <Link href={file.url} target="_blank" rel="noopener noreferrer">
              <DownloadIcon className="size-4" />
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className='cursor-pointer'
          onClick={onDelete}
          disabled={isPending}
          title="Remove file"
          aria-label="Remove file"
        >
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
          <span className="sr-only">Remove</span>
        </Button>
      </ItemActions>
    </Item>
  )
}

export function useProjectFilesDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [project, setProject] = useState<ChatProjectRecord | null>(null)

  return {
    open: useCallback((target: ChatProjectRecord) => {
      setProject(target)
      open()
    }, [open]),
    close,
    render: () =>
      project !== null && (
        <ProjectFilesDialog
          key={key}
          open={isOpen}
          onOpenChange={setIsOpen}
          project={project}
        />
      ),
  }
}
