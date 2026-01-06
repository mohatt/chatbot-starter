import { useCallback, createRef, useMemo, useRef, useState, useEffect, type DragEvent } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { useLazyRef } from '@/hooks/use-lazy-ref'
import { useUploadFileMutation } from '@/api/mutations/files'
import { AsyncCaller } from '@/lib/async-caller'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'
import { fileUpload, getAllowedTypes, type FileUpload } from '@/lib/schema/file-upload'
import type { inferVariables } from 'react-query-kit'
import type { AppError } from '@/lib/errors'

export type ClientUpload<B extends string> = Pick<FileUpload, 'id' | 'name' | 'mimeType'> & {
  status: "idle" | "uploading" | "uploaded" | "error";
  bucket: B;
  url?: string | null;
  previewUrl?: string | null;
  error?: string | null;
};

export type ClientErrorProps<B extends string> = {
  message: string;
  bucket?: B
  file?: File;
}

type UploadPayload = inferVariables<typeof useUploadFileMutation>
type UploadNS = UploadPayload['metadata']['namespace']
type ExplodeMetadata<T> =
  T extends any
    ? T extends { metadata: infer M }
      ? M extends any
        ? Omit<T, 'metadata'> & { metadata: M }
        : never
      : never
    : never
type UploadPayloadExploded = ExplodeMetadata<UploadPayload>
type BucketsForNS<N extends UploadNS> = Extract<UploadPayloadExploded, { metadata: { namespace: N } }>['bucket']
type MetadataForNS<N extends UploadNS> = Extract<UploadPayloadExploded['metadata'], { namespace: N }>

export interface UseFileUploadProps<N extends UploadNS, B extends string> {
  metadata: MetadataForNS<N>
  buckets: readonly B[]
  limit?: number
  initialFiles?: readonly ClientUpload<B>[]
  onError?: (props: ClientErrorProps<B>) => void
}

const imagesRules = config.uploads.images.rules
const retrievalRules = config.uploads.retrieval.rules
const allBuckets = {
  images: {
    schema: fileUpload(imagesRules),
    types: getAllowedTypes(imagesRules),
    title: 'Upload images'
  },
  retrieval: {
    schema: fileUpload(retrievalRules),
    types: getAllowedTypes(retrievalRules),
    title: 'Upload documents'
  },
} satisfies Record<UploadPayload['bucket'], object>

export function useFileUpload<N extends UploadNS, B extends BucketsForNS<N>>(props: UseFileUploadProps<N, B>) {
  const { buckets, metadata, limit = 1, initialFiles = [], onError } = props;
  const isSingle = limit === 1
  const { mutateAsync } = useUploadFileMutation();
  const [files, setFiles] = useState(initialFiles);
  const [isDragging, setIsDragging] = useState(false);

  const queueRef = useLazyRef(() => new AsyncCaller({
    maxConcurrency: Infinity,
    maxRetries: 0, // React query will handle retries when possible
  }))

  const bucketRefs = useLazyRef(() => {
    if (!buckets.length) {
      return []
    }

    return [undefined, ...buckets].map((id) => {
      const inputRef = createRef<HTMLInputElement>()
      if (id === undefined) {
        return {
          id,
          inputRef,
          schema: undefined,
          types: {
            accept: Array.from(new Set(buckets.flatMap((bid) => allBuckets[bid].types.accept))),
            extensions: Array.from(new Set(buckets.flatMap((bid) => allBuckets[bid].types.extensions))),
          },
          title: 'Upload files',
        } as const
      }

      const { schema, types, title } = allBuckets[id]
      return { id, inputRef, schema, types, title } as const
    })
  })

  const openFileDialog = useCallback((bucket?: B) => {
    const { inputRef } = bucketRefs.current.find(({ id }) => id === bucket)!
    inputRef.current?.click()
  }, []);

  const validateFile = useCallback((file: File, bucket?: B) => {
    const refs = bucketRefs.current
    if (bucket !== undefined) {
      const bucketRef = refs.find(({ id }) => id === bucket)
      return bucketRef
        ? [bucket, bucketRef.schema!.safeParse(file)] as const
        : undefined
    }
    let i = 0
    for (const { id, schema } of refs) {
      i++
      if(id !== undefined) {
        const result = schema!.safeParse(file)
        if (result.success || i === refs.length) return [id, result] as const
      }
    }
    return undefined
  }, [])

  const uploadFiles = useEventCallback((input: File[] | FileList, bucket?: B) => {
    const incoming = Array.from(input);
    const accepted = incoming
      .map((file) => {
        const result = validateFile(file, bucket)
        if (!result) {
          throw new Error('Could not find valid upload bucket')
        }

        const [fileBucket, fileResult] = result
        if (fileResult.success) {
          return [fileBucket, fileResult.data] as const
        }

        onError?.({
          file,
          bucket: fileBucket,
          message: fileResult.error.issues[0].message,
        })
        return undefined
      })
      .filter((data) => data != null);
    if (accepted.length === 0) {
      return; // No files passed schema validation
    }

    const capacity = isSingle ? 1 : Math.max(0, limit - files.length)
    if (accepted.length > capacity) {
      onError?.({
        message: capacity <= 0
          ? "You’ve already attached the maximum number of files."
          : "Too many files. Some were skipped.",
      })
    }

    const capped = accepted.slice(0, capacity)
    if (capped.length === 0) {
      return;
    }

    // In single file mode, clear existing files first
    if (isSingle) {
      clearFiles()
    }

    setFiles((prev) => prev.concat(
      capped.map(([fileBucket, { id, name, mimeType, blob }]) => {
        const previewUrl = mimeType.startsWith('image/')
          ? URL.createObjectURL(blob)
          : null
        return {
          id,
          status: "idle",
          bucket: fileBucket,
          name,
          mimeType,
          previewUrl,
          url: null,
          error: null,
        }
      })
    ))

    // Queue files for upload
    for (const [fileBucket, { id, blob }] of capped) {
      queueRef.current
        .call(async () => {
          updateFile(id, { status: "uploading" })
          return mutateAsync({ file: blob, bucket: fileBucket, metadata } as any)
        })
        .then((uploadedFile) => {
          updateFile(id, {
            status: "uploaded",
            mimeType: uploadedFile.mimeType,
            url: uploadedFile.url,
          })
        })
        .catch((err: AppError) => {
          updateFile(id, {
            status: "error",
            error: String(err.cause || err),
          })
        })
    }
  })

  const addFile = useCallback((file: ClientUpload<B>) => {
    setFiles((prev) => prev.concat([file]))
  }, []);

  const updateFile = useCallback((id: string, data: Partial<ClientUpload<never>>) => {
    setFiles((prev) => prev.map((f) => f.id === id
      ? { ...f, ...data }
      : f
    ))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => {
      if (f.id === id) {
        const url = f?.previewUrl ?? f?.url;
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
        return false
      }
      return true
    }))
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => prev.filter((file) => {
      const url = file.previewUrl ?? file.url;
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
      return false
    }))
  }, []);

  const { hasPending: hasPendingFiles, hasFailed: hasFailedFiles, hasMax: hasMaxFiles } = useMemo(() => {
    let hasPending = false
    let hasFailed = false
    for (const file of files) {
      if (file.status === "uploading" || file.status === "idle") {
        hasPending = true;
      } else if (file.status === "error") {
        hasFailed = true;
      }
    }
    return {
      hasPending,
      hasFailed,
      hasMax: files.length >= limit,
    };
  }, [files, limit])

  // Keep a ref to files for cleanup on unmount (avoids stale closure)
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => {
    // cleanup only on unmount; filesRef always current
    return () => {
      for (const f of filesRef.current) {
        const url = f.previewUrl ?? f.url;
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      }
    }
  }, []);

  const renderFileInput = () => {
    return (
      <div className="hidden">
        {bucketRefs.current.map(({ id, inputRef, types, title }) => (
          <input
            key={id ?? null}
            type="file"
            ref={inputRef}
            accept={types.accept.join(', ')}
            multiple={!isSingle}
            onChange={(e) => {
              if (e.currentTarget.files) uploadFiles(e.currentTarget.files, id);
              // Reset input value to allow selecting files that were previously removed
              e.currentTarget.value = "";
            }}
            title={title}
            aria-label={title}
          />
        ))}
      </div>
    )
  }

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const getDnDProps = (className?: string) => {
    return {
      className: cn(className, isDragging && 'border-dashed border-primary'),
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  }

  return {
    files,
    hasPendingFiles,
    hasFailedFiles,
    hasMaxFiles,
    isDragging,
    bucketRefs,
    renderFileInput,
    getDnDProps,
    openFileDialog,
    uploadFiles,
    addFile,
    removeFile,
    clearFiles,
  }
}
