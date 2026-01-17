import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStickToBottomContext } from 'use-stick-to-bottom'
import { isStaticToolUIPart } from 'ai'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageAttachments,
  MessageAttachment,
} from '@/components/ai-elements/message'
import { Streamdown } from "streamdown";
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
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
import {
  AlertCircleIcon,
  RefreshCwIcon,
  CopyIcon,
  PencilIcon,
  BrainIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Carousel, CarouselContent, type CarouselApi } from '@/components/ui/carousel'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from '@/components/ui/badge'
import type { UseChatResult } from './hooks'

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
        const { id, role, parts } = message
        if (!parts.length && role === 'assistant') {
          if (index === totalCount - 1) {
            if (isStreaming) {
              return <ThinkingMessage key={id} />
            }

            if (!error) {
              return (
                <ErrorMessage
                  key={id}
                  error={new Error('Stream aborted')}
                  regenerate={regenerate}
                />
              )
            }
          }

          return null
        }

        return (
          <ChatMessage
            key={id}
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
  const isAssistant = role === 'assistant'
  const isEditMode = editorId === id

  const { groupedParts, textParts, fileRefs } = useMemo(() => {
    type Part = typeof message['parts'][0]
    type FilePart = Extract<Part, { type: 'file' }>
    type ThinkPart = Extract<Part, { type: `tool-${string}` | 'reasoning' }>
    type TextPart = Extract<Part, { type: 'text' }>
    type GroupPart = { type: 'files', group: FilePart[] } | { type: 'thinking', group: ThinkPart[] }
    const $newParts: Array<Exclude<Part, FilePart | ThinkPart> | GroupPart> = []
    const $textParts: TextPart[] = []
    const $fileRefs: Record<string, Record<'id' | 'name' | 'mimeType', string>> = {}

    let current = null as GroupPart | null
    const flush = () => {
      if (!current) return
      $newParts.push(current)
      current = null
    }
    const addPart = <T extends GroupPart['type']>(type: T, part: Extract<GroupPart, { type: T }>['group'][0]) => {
      if (current?.type !== type) {
        flush()
        current = { type, group: [part as any] }
        return
      }
      current.group.push(part as any)
    }

    for (const part of parts) {
      if (part.type === 'step-start') continue
      if (part.type === 'file') {
        addPart('files', part)
        continue
      }
      if (part.type === 'reasoning') {
        addPart('thinking', part)
        continue
      }
      if (isStaticToolUIPart(part)) {
        if (part.state === 'output-available') {
          if (part.type === 'tool-readFile' && part.output.data) {
            $fileRefs[part.output.data.id] ??= part.output.data
          } else if (part.type === 'tool-readFileText' && part.output) {
            $fileRefs[part.output.id] ??= part.output
          } else if (part.type === 'tool-fileTextSearch' && part.output.data) {
            part.output.data.forEach(({ file }) => {
              $fileRefs[file.id] ??= file
            })
          }
        }
        addPart('thinking', part)
        continue
      }
      flush()
      if (part.type === 'text') {
        $textParts.push(part)
      }
      $newParts.push(part)
    }
    flush()

    return {
      groupedParts: $newParts,
      textParts: $textParts,
      fileRefs: Object.values($fileRefs),
    }
  }, [parts])

  const hasTextParts = textParts.length > 0
  const handleCopy = () => {
    if (!hasTextParts) return
    navigator.clipboard.writeText(textParts.map(({ text }) => text).join('\n\n'))
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'))
  }

  if (!groupedParts.length) {
    return null
  }

  return (
    <Message from={role} className={cn('justify-start [&>*:first-child]:mt-0', (isAssistant || isEditMode) && 'max-w-full')}>
      {groupedParts.map((part, i) => {
        if (part.type === 'files') {
          return (
            <MessageAttachments key={`${i}-files`}>
              {part.group.map((filePart, j) => (
                <MessageAttachment key={`${i}-file-${j}`} data={filePart} />
              ))}
            </MessageAttachments>
          )
        }

        if (part.type === 'thinking') {
          const isGroupStreaming = !!isStreaming && groupedParts[i+1] === undefined
          return (
            <Reasoning key={`${i}-thinking`} isStreaming={isGroupStreaming} defaultOpen={isStreaming} className='mt-4'>
              <ReasoningTrigger />
              <ReasoningContent className='flex flex-col gap-4'>
                {part.group.map((tPart, j) => {
                  if (tPart.type === 'reasoning') {
                    const isReasoningStreaming = tPart.state === 'streaming'
                    if (!isReasoningStreaming && !tPart.text.trim()) {
                      return null
                    }
                    return (
                      <Streamdown
                        key={`${i}-${tPart.type}-${j}`}
                        mode={isReasoningStreaming ? 'streaming' : 'static'}
                        isAnimating={isReasoningStreaming}
                      >
                        {tPart.text}
                      </Streamdown>
                    )
                  }
                  return (
                    <Tool key={`${i}-${tPart.type}-${j}`} className='w-fit max-w-full border-0 mb-0'>
                      <ToolHeader state={tPart.state} type={tPart.type} title={tPart.title} className='p-0 w-fit' />
                      <ToolContent>
                        <ToolInput input={tPart.input} />
                        <ToolOutput errorText={tPart.errorText} output={tPart.output} />
                      </ToolContent>
                    </Tool>
                  )
                })}
              </ReasoningContent>
            </Reasoning>
          );
        }

        if (part.type === 'text') {
          if (isEditMode) {
            return (
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
            )
          }

          const isTextStreaming = part.state === 'streaming'
          return (
            <MessageContent className='max-w-full' key={`${i}-text`}>
              {isAssistant ? (
                <Streamdown
                  caret={isTextStreaming ? 'block' : undefined}
                  mode={isTextStreaming ? 'streaming' : 'static'}
                  isAnimating={isTextStreaming}
                >
                  {part.text}
                </Streamdown>
              ) : (
                <p className='whitespace-pre-wrap'>
                  {part.text}
                </p>
              )}
            </MessageContent>
          );
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
          {fileRefs.length > 0 && (
            <Sources className='ml-1'>
              {fileRefs.map(({ id, name, mimeType }, i) => (
                <SourceItem key={`${id}-${i}`} title={name} description={mimeType} />
              ))}
            </Sources>
          )}
        </MessageActions>
      )}
    </Message>
  )
}

interface SourcesProps {
  children: ReactNode
  className?: string
}

function Sources({ children, className }: SourcesProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className={cn('group inline items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Badge className="hover:bg-secondary/80" variant='secondary' asChild>
            <button type='button'>Sources</button>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="relative w-80 p-0" align='start' side='top'>
          <Carousel className="w-full" setApi={setApi}>
            <div className="flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2">
              <button
                type="button"
                className="shrink-0"
                aria-label="Previous"
                onClick={() => api?.scrollPrev()}
              >
                <ArrowLeftIcon className="size-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                className="shrink-0"
                aria-label="Next"
                onClick={() => api?.scrollNext()}
              >
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              </button>
              <div className="flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs">
                {current}/{count}
              </div>
            </div>
            <CarouselContent>
              {children}
            </CarouselContent>
          </Carousel>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface SourceItemProps {
  title: string
  subtitle?: string
  description?: string
  className?: string
}

function SourceItem({ title, subtitle, description, className }: SourceItemProps) {
  return (
    <div className={cn("min-w-full space-y-2 p-4 pl-8", className)}>
      <div className='space-y-1'>
        <h4 className="truncate font-medium text-sm leading-tight">{title}</h4>
        {subtitle && (
          <p className="truncate break-all text-muted-foreground text-xs">{subtitle}</p>
        )}
        {description && <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>}
      </div>
    </div>
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
        <InputGroupButton
          size="sm"
          variant="default"
          disabled={!input.trim() || input.trim() === initialValue}
          onClick={() => {
            onSubmit(input.trim())
              .catch(() => {
                toast.error('Failed to update message')
              })
            onCancel()
          }}
        >
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
        <Item variant="outline" className='min-w-md'>
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
          <BrainIcon className="size-4" />
        </div>
        <div className="flex w-full flex-col gap-2 md:gap-4"></div>
      </div>
    </Message>
  );
}
