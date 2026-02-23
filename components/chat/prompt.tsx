'use client'
import { useRef, useState, type SubmitEvent, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useUserBilling } from '@/hooks/use-user-billing'
import {
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
} from '@/components/ai-elements/prompt-input'
import { InputGroup, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { ChatModelSelector } from '@/components/chat/model-selector'
import { PromptAttachment } from './prompt-attachment'
import {
  CornerDownLeftIcon,
  ImageIcon,
  Loader2Icon,
  PaperclipIcon,
  SquareIcon,
  CircleAlertIcon,
} from 'lucide-react'
import type { UseChatResult } from './hooks'

export interface ChatPromptProps extends Pick<UseChatResult, 'sendMessage' | 'stop' | 'status'> {
  chatId: string
  isPending?: boolean
  isDisabled?: boolean
  isEphemeral?: boolean
}

export const ChatPrompt = (props: ChatPromptProps) => {
  const { chatId, sendMessage, stop, status, isPending, isDisabled } = props
  const [input, setInput] = useState('')

  const {
    data: billing,
    isLoading: isBillingLoading,
    error: billingError,
    hasNoChatCredits,
  } = useUserBilling()
  const maxMessageFiles = billing?.tierConfig.maxMessageFiles ?? 0
  const warning = hasNoChatCredits
    ? 'You’ve reached your monthly chat usage limit.'
    : billingError
      ? 'Failed loading your chat usage information.'
      : null

  const isStreaming = status === 'submitted' || status === 'streaming'
  const isDataLoading = isPending || isBillingLoading
  const isInputDisabled = isDisabled || hasNoChatCredits || !!billingError
  const isComposingRef = useRef(false)
  const {
    files,
    uploadFiles,
    removeFile,
    clearFiles,
    hasPendingFiles,
    hasFailedFiles,
    hasMaxFiles,
    openFileDialog,
    renderUpload,
  } = useFileUpload({
    enabled: !isInputDisabled && maxMessageFiles > 0,
    limit: maxMessageFiles,
    buckets: ['images', 'retrieval'],
    metadata: { namespace: 'chat', chatId },
  })

  const isFileUploadDisabled = isInputDisabled || hasMaxFiles || maxMessageFiles <= 0
  const isSubmitDisabled =
    isInputDisabled ||
    isStreaming ||
    isDataLoading ||
    !input.trim() ||
    hasPendingFiles ||
    hasFailedFiles

  const handleSubmit = useEventCallback((e?: SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) {
      return
    }

    void sendMessage({
      parts: [{ type: 'text' as const, text }],
      metadata: {
        files: files
          .filter((f) => f.status === 'uploaded' && f.url)
          .map(({ id, name, mimeType, size, metadata, url, createdAt }) => {
            return { id, name, mimeType, size, url: url!, metadata, createdAt }
          }),
      },
    })
    setInput('')
    clearFiles()
  })

  const handleKeyDown = useEventCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return
      if (e.shiftKey) return
      e.preventDefault()

      // Check if the submit button is disabled before submitting
      if (!isSubmitDisabled) {
        handleSubmit()
      }
    }

    // Remove last file when Backspace is pressed and textarea is empty
    if (e.key === 'Backspace' && e.currentTarget.value === '' && files.length > 0) {
      e.preventDefault()
      const lastFile = files.at(-1)
      if (lastFile) removeFile(lastFile.id)
    }
  })

  const handlePaste = useEventCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const clipboardFiles: File[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          clipboardFiles.push(file)
        }
      }
    }

    if (clipboardFiles.length > 0) {
      e.preventDefault()
      uploadFiles(clipboardFiles)
    }
  })

  return (
    <form onSubmit={handleSubmit} className='size-full mt-4'>
      {renderUpload(
        <InputGroup className='hover:ring-1 hover:ring-ring/50'>
          {warning && (
            <div className='p-3 pb-1 w-full'>
              <Alert variant='destructive'>
                <CircleAlertIcon />
                <AlertTitle>{warning}</AlertTitle>
              </Alert>
            </div>
          )}
          {files.length > 0 && (
            <div className='flex flex-wrap items-center gap-2 p-3 pb-1 w-full'>
              {files.map((file) => (
                <PromptAttachment key={file.id} file={file} onRemove={removeFile} />
              ))}
            </div>
          )}
          <PromptInputBody>
            <InputGroupTextarea
              name='message'
              className='field-sizing-content max-h-48 min-h-16 p-4 pb-1'
              placeholder='What’s on your mind today?'
              value={input}
              disabled={isInputDisabled}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onCompositionStart={() => {
                isComposingRef.current = true
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false
              }}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  title='Attach files'
                  disabled={isFileUploadDisabled}
                />
                <PromptInputActionMenuContent>
                  <PromptInputActionMenuItem
                    onClick={() => openFileDialog('images')}
                    disabled={isFileUploadDisabled}
                  >
                    <ImageIcon className='size-4' /> Add photos
                  </PromptInputActionMenuItem>
                  <PromptInputActionMenuItem
                    onClick={() => openFileDialog('retrieval')}
                    disabled={isFileUploadDisabled}
                  >
                    <PaperclipIcon className='size-4' /> Add documents
                  </PromptInputActionMenuItem>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <ChatModelSelector disabled={isInputDisabled} />
            </PromptInputTools>
            {isStreaming ? (
              <InputGroupButton
                type='button'
                variant='default'
                size='icon-sm'
                title='Stop'
                aria-label='Stop'
                onClick={stop}
              >
                <SquareIcon className='size-4' />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type='submit'
                variant='default'
                size='icon-sm'
                title='Submit'
                aria-label='Submit'
                disabled={isSubmitDisabled}
              >
                {isDataLoading ? (
                  <Loader2Icon className='size-4 animate-spin' />
                ) : (
                  <CornerDownLeftIcon className='size-4' />
                )}
              </InputGroupButton>
            )}
          </PromptInputFooter>
        </InputGroup>,
      )}
    </form>
  )
}
