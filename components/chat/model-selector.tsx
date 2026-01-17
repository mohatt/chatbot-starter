import { useState } from 'react'
import { useClientSettings } from '@/hooks/client-settings'
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { InputGroupButton } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckIcon } from 'lucide-react'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

const { models } = config.chat
const defaultModel = models.getDefault()
const modelsByVendor = models.registry.reduce(
  (acc, m) => {
    const group = m.provider === 'huggingface' ? 'huggingface' : m.vendor ?? 'Unknown'
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(m);
    return acc;
  },
  {} as Record<string, Array<typeof models.registry[number]>>
);
const knownVendors: Record<string, string> = {
  xai: "xAI",
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  huggingface: "Hugging Face",
};

export interface ChatModelSelectorProps {
  className?: string;
  disabled?: boolean;
}

export function ChatModelSelector({ className, disabled }: ChatModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, mutate } = useClientSettings()

  const userModel = data?.chatModel
  const isThinkingActive = userModel?.variant === 'thinking'
  const activeModel = userModel?.entry ?? defaultModel
  const activeModelKey = activeModel.getKey()
  const activeModelLogo = activeModel.provider === 'huggingface' ? 'huggingface' : activeModel.vendor
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <ModelSelector open={isOpen} onOpenChange={setIsOpen}>
        <ModelSelectorTrigger asChild>
          <InputGroupButton type="button" size='sm' disabled={disabled}>
            <ModelSelectorLogo provider={activeModelLogo ?? 'unknown'} />
            <ModelSelectorName>{activeModel.name}</ModelSelectorName>
          </InputGroupButton>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
            {Object.entries(modelsByVendor).map(([vendor, group]) => (
              <ModelSelectorGroup key={vendor} heading={knownVendors[vendor] ?? vendor}>
                {group.map((model) => {
                  const key = model.getKey()
                  const logo = model.provider === 'huggingface' ? 'huggingface' : model.vendor
                  const isActive = activeModelKey === key
                  return (
                    <ModelSelectorItem
                      key={key}
                      onSelect={() => {
                        mutate({ chatModel: model.getKey(model.thinking ? userModel?.variant : undefined) })
                        setIsOpen(false);
                      }}
                      value={key}
                    >
                      {logo && <ModelSelectorLogo provider={logo} />}
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      {model.thinking && (
                        <div className='flex shrink-0 items-center'>
                          <Badge
                            variant={isActive && isThinkingActive ? 'default' : 'outline'}
                          >
                            Thinking
                          </Badge>
                        </div>
                      )}
                      {isActive ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </ModelSelectorItem>
                  )
                })}
              </ModelSelectorGroup>
            ))}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>
      {activeModel.thinking && (
        <div className="flex items-center gap-2 min-h-8 px-2">
          <Switch
            id="thinking-mode"
            checked={isThinkingActive}
            disabled={disabled || activeModel.thinking === 'always'}
            onCheckedChange={(checked) => {
              mutate({ chatModel: activeModel.getKey(checked ? 'thinking' : undefined) })
            }}
          />
          <Label htmlFor="thinking-mode">Thinking</Label>
        </div>
      )}
    </div>
  )
}
