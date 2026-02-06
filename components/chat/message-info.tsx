import { useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MessageAction } from '@/components/ai-elements/message'
import { InfoIcon } from 'lucide-react'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'
import type { ModelUsage, ChatMessageMetadata } from '@/lib/ai'

export interface ModelMessageInfoProps {
  metadata: ChatMessageMetadata
  usage?: ModelUsage
  className?: string
}

export function ModelMessageInfo(props: ModelMessageInfoProps) {
  const { metadata, usage, className } = props

  const modelInfo = useMemo(() => {
    if (!metadata.model) return null
    try {
      return config.chat.models.resolveKey(metadata.model)
    } catch {
      return null
    }
  }, [metadata])

  const usageInfo = useMemo(() => {
    if (!usage) return null
    const { tokens, cost } = usage
    const tokensLabel = tokens.total != null ? `${formatUsageTokens(tokens.total)} tokens` : null
    const costLabel = cost.total != null && cost.total > 0
      ? formatUsageCost(cost.total)
      : null
    if (tokensLabel && costLabel) return `${tokensLabel} · ${costLabel}`
    return tokensLabel ?? costLabel ?? null
  }, [usage])

  return (
    <div className={cn('group inline items-center', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <MessageAction
            label="Model Info"
            title="Model Info"
            size='icon-sm'
          >
            <InfoIcon className="size-4" />
          </MessageAction>
        </PopoverTrigger>
        <PopoverContent className="relative w-80 p-0" align='start' side='top'>
          <div className="flex items-center gap-2 rounded-t-md bg-secondary p-3 text-muted-foreground text-xs">
            Model Info
          </div>
          <div className='space-y-2 p-3 font-medium text-sm'>
            <div>{modelInfo?.name ?? metadata.model?.id ?? 'Unknown model'}</div>
            {usageInfo && (
              <div className='text-muted-foreground'>{usageInfo}</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function formatUsageTokens(value: number) {
  if (value >= 1000) {
    const digits = value >= 10000 ? 0 : 1
    return `${(value / 1000).toFixed(digits)}k`
  }
  return String(Math.round(value))
}

function formatUsageCost(value: number) {
  const digits = value < 0.01 ? 4 : 2
  return `$${value.toFixed(digits)}`
}
