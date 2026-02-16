import { useMemo, useState } from 'react'
import { useStickToBottomContext } from 'use-stick-to-bottom'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { isStaticToolUIPart } from 'ai'
import { cn } from '@/lib/utils'
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import { Attachments, Attachment, AttachmentPreview } from '@/components/ai-elements/attachments'
import { Streamdown } from 'streamdown'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  InputGroupButton,
} from '@/components/ui/input-group'
import {
  AlertCircleIcon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
  PencilIcon,
  BrainIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Sources, SourceItem, type SourceFileItem, type SourceUrlItem } from './sources'
import { ModelMessageInfo } from './message-info'
import type { OpenaiResponsesTextProviderMetadata } from '@ai-sdk/openai'
import type { ChatTools, ModelUsage } from '@/lib/ai'
import type { UseChatResult } from './hooks'

// Pre-configured streamdown plugins with default settings
const streamdownPlugins = { cjk, code, math, mermaid };

export type ChatMessagesProps = Pick<UseChatResult,
  'messages' | 'sendMessage' | 'regenerate' | 'status' | 'error'
> & {
  isReadonly: boolean
  modelUsageMap: Record<string, ModelUsage>
}

export function ChatMessages(props: ChatMessagesProps) {
  const { isReadonly, messages, modelUsageMap, sendMessage, regenerate, status, error } = props
  const [editorId, setEditorId] = useState<string | null>(null)
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
            modelUsage={modelUsageMap[id]}
            editorId={editorId}
            isReadonly={isReadonly}
            isStreaming={index === totalCount - 1 && isStreaming}
            regenerate={regenerate}
            sendMessage={sendMessage}
            setEditorId={setEditorId}
          />
        )
      })}
      {status === 'submitted' && <ThinkingMessage />}
      {(status === 'error' || error) && <ErrorMessage error={error} regenerate={regenerate} />}
    </>
  )
}

const toolTitles: Record<`tool-${keyof ChatTools}`, string> = {
  'tool-list_files': 'Reading project files',
  'tool-read_file': 'Reading file',
  'tool-read_file_text': 'Reading document',
  'tool-file_text_search': 'Searching documents',
  'tool-google_search': 'Searching web',
  'tool-openai_web_search': 'Searching web',
  'tool-anthropic_web_search': 'Searching web',
}

interface ChatMessageProps extends Pick<UseChatResult, 'regenerate' | 'sendMessage'> {
  message: UseChatResult['messages'][0]
  modelUsage?: ModelUsage
  editorId: string | null
  setEditorId: (id: string | null) => void
  isReadonly?: boolean
  isStreaming?: boolean
}

function ChatMessage(props: ChatMessageProps) {
  const {
    message,
    modelUsage,
    editorId,
    isReadonly,
    isStreaming = false,
    regenerate,
    sendMessage,
    setEditorId,
  } = props
  const { id, role, parts, metadata } = message
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const scrollContext = useStickToBottomContext()
  const isAssistant = role === 'assistant'
  const isEditMode = editorId === id

  const { groupedParts, textParts, sources } = useMemo(() => {
    type Part = (typeof message)['parts'][0]
    type FilePart = Extract<Part, { type: 'file' }>
    type ThinkPart = Extract<Part, { type: `tool-${string}` | 'reasoning' }>
    type TextPart = Extract<Part, { type: 'text' }>
    type GroupPart = { type: 'files'; group: FilePart[] } | { type: 'thinking'; group: ThinkPart[] }

    const $newParts: Array<Exclude<Part, FilePart | ThinkPart> | GroupPart> = []
    const $textParts: TextPart[] = []
    const $fileRefs: Record<string, SourceFileItem> = {}
    const $urlRefs: Record<string, SourceUrlItem> = {}

    let current = null as GroupPart | null
    const flush = () => {
      if (!current) return
      $newParts.push(current)
      current = null
    }
    const addPart = <T extends GroupPart['type']>(
      type: T,
      part: Extract<GroupPart, { type: T }>['group'][0],
    ) => {
      if (current?.type !== type) {
        flush()
        current = { type, group: [part as any] }
        return
      }
      current.group.push(part as any)
    }

    if (metadata?.files?.length) {
      metadata.files.forEach((file) => {
        addPart('files', {
          type: 'file',
          filename: file.name,
          mediaType: file.mimeType,
          url: file.url,
        })
      })
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
          if (part.type === 'tool-read_file' && part.output.data) {
            $fileRefs[part.output.data.id] ??= part.output.data
          } else if (part.type === 'tool-read_file_text' && part.output) {
            $fileRefs[part.output.id] ??= part.output
          } else if (part.type === 'tool-file_text_search' && part.output.data) {
            part.output.data.forEach(({ file }) => {
              $fileRefs[file.id] ??= file
            })
          } else if (part.type === 'tool-anthropic_web_search') {
            part.output.forEach((item) => {
              if (item.type === 'web_search_result') {
                $urlRefs[item.url] ??= item
              }
            })
          }
        }
        addPart('thinking', part)
        continue
      }
      if (part.type === 'source-url') {
        $urlRefs[part.url] ??= part
        continue
      }
      flush()
      if (part.type === 'text') {
        const providerMetadata = part.providerMetadata as
          | OpenaiResponsesTextProviderMetadata
          | undefined
        // Get sources for openai web search results
        providerMetadata?.openai?.annotations?.forEach((item) => {
          if (item.type === 'url_citation') {
            $urlRefs[item.url] ??= item
          }
        })
        $textParts.push(part)
      }
      $newParts.push(part)
    }
    flush()

    return {
      groupedParts: $newParts,
      textParts: $textParts,
      fileRefs: $fileRefs,
      sources: [...Object.values($fileRefs), ...Object.values($urlRefs)],
    }
  }, [parts, metadata])

  const hasTextParts = textParts.length > 0
  return (
    <Message
      from={role}
      className={cn(
        'justify-start [&>*:first-child]:mt-0',
        (isAssistant || isEditMode) && 'max-w-full',
      )}
    >
      {groupedParts.map((part, i) => {
        if (part.type === 'files') {
          return (
            <Attachments key={`${i}-files`}>
              {part.group.map((filePart, j) => (
                <Attachment key={`${i}-file-${j}`} data={filePart as any}>
                  <AttachmentPreview />
                </Attachment>
              ))}
            </Attachments>
          )
        }

        if (part.type === 'thinking') {
          const isGroupStreaming = isStreaming && groupedParts[i + 1] === undefined
          return (
            <Reasoning
              key={`${i}-thinking`}
              isStreaming={isGroupStreaming}
              className='mt-4'
            >
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
                        animated
                      >
                        {tPart.text}
                      </Streamdown>
                    )
                  }
                  return (
                    <Tool
                      key={`${i}-${tPart.type}-${j}`}
                      className='w-fit max-w-full border-0 mb-0'
                    >
                      <ToolHeader
                        state={tPart.state}
                        type={tPart.type}
                        title={toolTitles[tPart.type]}
                        className='p-0 w-fit'
                      />
                      <ToolContent>
                        <ToolInput input={tPart.input} />
                        <ToolOutput output={tPart.output} errorText={tPart.errorText} />
                      </ToolContent>
                    </Tool>
                  )
                })}
              </ReasoningContent>
            </Reasoning>
          )
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
                    metadata: message.metadata,
                    parts: parts.map((p) => {
                      if (p === part) {
                        return { type: 'text', text: value }
                      }
                      return p
                    }),
                  })
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
                  plugins={streamdownPlugins}
                  animated
                >
                  {part.text}
                </Streamdown>
              ) : (
                <p className='whitespace-pre-wrap'>{part.text}</p>
              )}
            </MessageContent>
          )
        }
      })}
      {!isStreaming && !isEditMode && (
        <MessageActions
          className={cn(
            'text-muted-foreground gap-0',
            isAssistant
              ? 'justify-start mt-1'
              : 'justify-end pointer-fine:opacity-0 transition-opacity duration-300 delay-300 pointer-fine:pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
          )}
        >
          {hasTextParts && (
            <MessageAction
              onClick={() => copyToClipboard(textParts.map(({ text }) => text).join(''))}
              label='Copy'
              title='Copy'
              size='icon-sm'
              className={isCopied ? 'pointer-events-none' : ''}
            >
              {isCopied ? <CheckIcon className='size-4' /> : <CopyIcon className='size-4' />}
            </MessageAction>
          )}
          {!isReadonly &&
            (isAssistant ? (
              <>
                <MessageAction
                  onClick={() => regenerate({ messageId: id })}
                  label='Retry'
                  title='Retry'
                  size='icon-sm'
                >
                  <RefreshCwIcon className='size-4' />
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
                    label='Edit'
                    title='Edit'
                    size='icon-sm'
                  >
                    <PencilIcon className='size-4' />
                  </MessageAction>
                )}
              </>
            ))}
          {metadata && 'model' in metadata && (
            <ModelMessageInfo metadata={metadata} usage={modelUsage} className='ml-1' />
          )}
          {sources.length > 0 && (
            <Sources className='ml-1'>
              {sources.map((item, i) => (
                <SourceItem key={i} item={item} />
              ))}
            </Sources>
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
      <InputGroupTextarea value={input} onChange={(e) => setInput(e.target.value)} />
      <InputGroupAddon align='block-end'>
        <InputGroupButton
          className='ml-auto'
          size='sm'
          variant='secondary'
          onClick={() => onCancel()}
        >
          Cancel
        </InputGroupButton>
        <InputGroupButton
          size='sm'
          variant='default'
          disabled={!input.trim()}
          onClick={() => {
            void onSubmit(input.trim())
            onCancel()
          }}
        >
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

function ErrorMessage(props: Pick<UseChatResult, 'error' | 'regenerate'>) {
  const { error, regenerate } = props
  return (
    <Message from='assistant'>
      <MessageContent>
        <Item variant='outline' className='min-w-md'>
          <ItemMedia variant='icon'>
            <AlertCircleIcon className='text-destructive' />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Failed generating a response</ItemTitle>
            {error && <ItemDescription>{error.message}</ItemDescription>}
          </ItemContent>
          <ItemActions>
            <Button size='sm' variant='outline' onClick={() => regenerate()}>
              <RefreshCwIcon className='size-3.5' /> Retry
            </Button>
          </ItemActions>
        </Item>
      </MessageContent>
    </Message>
  )
}

function ThinkingMessage() {
  return (
    <Message from='assistant'>
      <div className='flex items-center gap-2'>
        <div className='animate-pulse'>
          <BrainIcon className='size-4' />
        </div>
        <div className='flex w-full flex-col gap-2 md:gap-4'></div>
      </div>
    </Message>
  )
}
