import { useMemo, useState } from 'react'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
  MessageAttachments,
  MessageAttachment,
} from '@/components/ai-elements/message'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  InputGroupButton,
} from "@/components/ui/input-group"
import { AlertCircleIcon, RefreshCwIcon, CopyIcon, PencilIcon, MessageSquareMoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { UseChatResult } from './hooks'
import { cn } from '@/lib/utils'
import { LoadingDots } from '@/components/loading'
import { useStickToBottomContext } from 'use-stick-to-bottom'

export interface ChatMessagesProps extends Pick<UseChatResult, 'messages' | 'sendMessage' | 'regenerate' | 'status' | 'error'>{
  isReadonly: boolean;
}

export function ChatMessages(props: ChatMessagesProps) {
  const { isReadonly, messages, sendMessage, regenerate, status, error } = props
  const [editorId, setEditorId] = useState<string | null>(null);
  const totalCount = messages.length
  const isStreaming = status === 'streaming'
  return (
    <>
      {messages.map((message, index) => {
        return (
          <ChatMessage
            key={message.id}
            message={message}
            editorId={editorId}
            isReadonly={isReadonly}
            isStreaming={index === totalCount - 1 && isStreaming}
            regenerate={regenerate}
            sendMessage={sendMessage}
            setEditorId={setEditorId}
          />
        )
      })}
      {status === "submitted" && <ThinkingMessage />}
      {(status === "error" || error) && <ErrorMessage error={error} regenerate={regenerate} />}
    </>
  )
}

interface ChatMessageProps extends Pick<UseChatResult, 'regenerate' | 'sendMessage'> {
  message: UseChatResult['messages'][0]
  editorId: string | null
  setEditorId: (id: string | null) => void
  isReadonly?: boolean
  isStreaming?: boolean
}

function ChatMessage(props: ChatMessageProps) {
  const { message, editorId, isReadonly, isStreaming, regenerate, sendMessage, setEditorId } = props
  const { id, role, parts } = message
  const scrollContext = useStickToBottomContext()
  const isEmpty = !parts.length
  const isAssistant = role === 'assistant'
  const isEditMode = editorId === id

  const { groupedParts, textParts } = useMemo(() => {
    type Part = typeof message['parts'][number]
    type FilePart = Extract<Part, { type: 'file' }>
    type TextPart = Extract<Part, { type: 'text' }>
    const $newParts: Array<Exclude<Part, { type: 'file' }> | { type: 'file', group: FilePart[] }> = []
    const $textParts: TextPart[] = []

    let filesGroup: FilePart[] = []
    const groupFiles = () => {
      if (!filesGroup.length) return
      $newParts.push({ type: 'file', group: filesGroup })
      filesGroup = []
    }

    for (const part of parts) {
      if (part.type === 'file') {
        filesGroup.push(part)
        continue
      }
      groupFiles()
      if (part.type === 'text') {
        $textParts.push(part)
      }
      $newParts.push(part)
    }
    groupFiles()

    return { groupedParts: $newParts, textParts: $textParts }
  }, [parts])

  const hasTextParts = textParts.length > 0
  const handleCopy = () => {
    if (!hasTextParts) return
    navigator.clipboard.writeText(textParts.map(({ text }) => text).join('\n\n'))
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'))
  }

  if (isEmpty && isAssistant) {
    return isStreaming ? <ThinkingMessage /> : null
  }

  return (
    <Message from={role} className={cn('justify-start', (isAssistant || isEditMode) && 'max-w-full')}>
      {groupedParts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return isEditMode ? (
              <ChatMessageEditor
                key={`${i}-editor`}
                initialValue={part.text}
                onCancel={() => setEditorId(null)}
                onSubmit={async (value) => {
                  await sendMessage({
                    messageId: id,
                    parts: parts.map((p) => {
                      if (p === part) {
                        return { type: 'text', text: value }
                      }
                      return p
                    }),
                  }, { body: { regenerate: true }})
                }}
              />
            ) : (
              <MessageContent className='max-w-full' key={`${i}-text`}>
                <MessageResponse
                  mode={isStreaming ? 'streaming' : 'static'}
                  isAnimating={isStreaming}
                >
                  {part.text}
                </MessageResponse>
              </MessageContent>
            );
          case 'file':
            return (
              <MessageAttachments key={`${i}-files`}>
                {part.group.map((filePart, j) => (
                  <MessageAttachment key={`${i}-file-${j}`} data={filePart} />
                ))}
              </MessageAttachments>
            )
          default:
            return null;
        }
      })}
      {!isStreaming && !isEditMode && (
        <MessageActions className={cn('text-muted-foreground gap-0', isAssistant ? 'justify-start' : 'justify-end pointer-fine:opacity-0 transition-opacity duration-300 delay-300 pointer-fine:pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto')}>
          {hasTextParts && (
            <MessageAction
              onClick={handleCopy}
              label="Copy"
              title="Copy"
              size='icon-sm'
            >
              <CopyIcon className="size-3.5" />
            </MessageAction>
          )}
          {!isReadonly && (
            isAssistant ? (
              <>
                <MessageAction
                  onClick={() => regenerate({ messageId: id })}
                  label="Retry"
                  title="Retry"
                  size='icon-sm'
                >
                  <RefreshCwIcon className="size-3.5" />
                </MessageAction>
              </>
            ) : (
              <>
                {hasTextParts && (
                  <MessageAction
                    onClick={() => {
                      // prevent auto-scroll to bottom when editor is opened
                      scrollContext.stopScroll()
                      setEditorId(id)
                    }}
                    label="Edit"
                    title="Edit"
                    size='icon-sm'
                  >
                    <PencilIcon className="size-3.5" />
                  </MessageAction>
                )}
              </>
            )
          )}
        </MessageActions>
      )}
    </Message>
  )
}

interface ChatMessageEditorProps {
  initialValue: string
  onCancel: () => void
  onSubmit: (value: string) => Promise<void>
}

function ChatMessageEditor(props: ChatMessageEditorProps) {
  const { initialValue, onCancel, onSubmit } = props
  const [input, setInput] = useState(initialValue)
  return (
    <InputGroup>
      <InputGroupTextarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <InputGroupAddon align="block-end">
        <InputGroupButton className="ml-auto" size="sm" variant="secondary" onClick={() => onCancel()}>
          Cancel
        </InputGroupButton>
        <InputGroupButton size="sm" variant="default" disabled={!input.trim() || input.trim() === initialValue} onClick={() => {
          onSubmit(input.trim())
            .catch(() => {
              toast.error('Failed to update message')
            })
          onCancel()
        }}>
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

function ErrorMessage(props: Pick<UseChatResult, 'error' | 'regenerate'>){
  const { error, regenerate } = props
  return (
    <Message from='assistant'>
      <MessageContent>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <AlertCircleIcon className='text-destructive' />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Failed generating a response</ItemTitle>
            {error && (
              <ItemDescription>
                {error.message}
              </ItemDescription>
            )}
          </ItemContent>
          <ItemActions>
            <Button size="sm" variant="outline" onClick={() => regenerate()}>
              <RefreshCwIcon className='size-3.5' /> Retry
            </Button>
          </ItemActions>
        </Item>
      </MessageContent>
    </Message>
  )
}

function ThinkingMessage(){
  return (
    <Message from='assistant'>
      <div className="flex items-center gap-2">
        <div className="animate-pulse">
          <MessageSquareMoreIcon className='size-5' />
        </div>
        <div className="flex w-full flex-col gap-2 md:gap-4">
          <LoadingDots message='Thinking' className='text-muted-foreground text-sm' />
        </div>
      </div>
    </Message>
  );
}
