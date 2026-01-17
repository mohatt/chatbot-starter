'use client';
import { useRef, useState, type FormEvent, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useEventCallback } from 'usehooks-ts'
import { useFileUpload } from '@/hooks/use-file-upload'
import { toast } from 'sonner'
import {
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
} from '@/components/ai-elements/prompt-input'
import { InputGroup, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { ChatModelSelector } from '@/components/chat/model-selector'
import { CornerDownLeftIcon, ImageIcon, Loader2Icon, PaperclipIcon, SquareIcon } from 'lucide-react'
import { config } from '@/lib/config'
import type { UseChatResult } from './hooks'

export interface ChatPromptProps extends Pick<UseChatResult, 'sendMessage' | 'stop' | 'status'> {
  chatId: string;
  isPending?: boolean
  isEphemeral?: boolean
}

export const ChatPrompt = (props: ChatPromptProps) => {
  const { chatId, sendMessage, stop, status, isPending, isEphemeral } = props;
  const [input, setInput] = useState('');
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
    limit: config.chat.message.maxFileParts,
    buckets: ['images', 'retrieval'],
    metadata: { namespace: 'chat', chatId },
    onError: ({ file, message }) => {
      toast.error(file?.name ?? 'Upload Error', {
        description: message
      })
    }
  })
  const isStreaming = status === 'submitted' || status === 'streaming'
  const isSubmitDisabled = !input.trim() || isStreaming || hasPendingFiles || hasFailedFiles;

  const handleSubmit = useEventCallback((e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const text = input.trim()
    if (!text) {
      return;
    }

    void sendMessage({
      text,
      files: files
        .filter((f) => f.status === 'uploaded' && f.url)
        .map(({ name, url, mimeType }) => ({
          type: 'file',
          filename: name,
          mediaType: mimeType,
          url: url!
        }))
    });
    setInput('');
    clearFiles()
  })

  const handleKeyDown = useEventCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (isComposingRef.current || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();

      // Check if the submit button is disabled before submitting
      if (!isSubmitDisabled) {
        handleSubmit();
      }
    }

    // Remove last file when Backspace is pressed and textarea is empty
    if (
      e.key === "Backspace" &&
      e.currentTarget.value === "" &&
      files.length > 0
    ) {
      e.preventDefault();
      const lastFile = files.at(-1);
      if (lastFile) removeFile(lastFile.id);
    }
  })

  const handlePaste = useEventCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const clipboardFiles: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          clipboardFiles.push(file);
        }
      }
    }

    if (clipboardFiles.length > 0) {
      e.preventDefault();
      uploadFiles(clipboardFiles);
    }
  })

  return (
    <form onSubmit={handleSubmit} className="size-full mt-4">
      {renderUpload(
        <InputGroup className='hover:ring-1 hover:ring-ring/50'>
          {files.length > 0 && (
            <div className='flex flex-wrap items-center gap-2 p-3 w-full'>
              {files.map((file) => (
                <PromptInputAttachment
                  key={file.id}
                  data={{
                    id: file.id,
                    type: 'file',
                    url: file.url ?? file.previewUrl ?? '',
                    filename: file.name,
                    mediaType: file.mimeType,
                  }}
                  isPending={file.status === 'idle' || file.status === 'pending'}
                  error={file.error}
                  onRemove={removeFile}
                />
              ))}
            </div>
          )}
          <PromptInputBody>
            <InputGroupTextarea
              name="message"
              className="field-sizing-content max-h-48 min-h-16 p-4 pb-1"
              placeholder='What’s on your mind today?'
              value={input}
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
                  disabled={isPending || isStreaming}
                />
                <PromptInputActionMenuContent>
                  <PromptInputActionMenuItem
                    onClick={() => openFileDialog('images')}
                    disabled={hasMaxFiles}
                  >
                    <ImageIcon className="size-4" /> Add photos
                  </PromptInputActionMenuItem>
                  <PromptInputActionMenuItem
                    onClick={() => openFileDialog('retrieval')}
                    disabled={hasMaxFiles}
                  >
                    <PaperclipIcon className="size-4" /> Add documents
                  </PromptInputActionMenuItem>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <ChatModelSelector disabled={isPending || isStreaming} />
            </PromptInputTools>
            {isStreaming ? (
              <InputGroupButton
                type="button"
                variant='default'
                size="icon-sm"
                title="Stop"
                aria-label="Stop"
                onClick={stop}
              >
                <SquareIcon className="size-4" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                variant='default'
                size="icon-sm"
                title="Submit"
                aria-label="Submit"
                disabled={isSubmitDisabled}
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CornerDownLeftIcon className="size-4" />
                )}
              </InputGroupButton>
            )}
          </PromptInputFooter>
        </InputGroup>
      )}
    </form>
  );
};
