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
} from '@/components/ai-elements/model-selector'
import { InputGroupButton } from '@/components/ui/input-group'
import { CheckIcon, GlobeIcon, BrainIcon } from 'lucide-react'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

const { models } = config.chat
const defaultModel = models.getDefault()
const modelGroups = models.registry.reduce(
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
const groupNames: Record<string, string> = {
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

  const active = data?.chatModel ?? defaultModel
  const activeModel = active.entry
  const activeModelId = activeModel.getKey()
  const activeModelLogo = activeModel.provider === 'huggingface' ? 'huggingface' : activeModel.vendor
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <ModelSelector open={isOpen} onOpenChange={setIsOpen}>
        <ModelSelectorTrigger asChild>
          <InputGroupButton type="button" size='sm' disabled={disabled}>
            <ModelSelectorLogo provider={activeModelLogo ?? 'unknown'} className='size-4' />
            <ModelSelectorName>{activeModel.name}</ModelSelectorName>
          </InputGroupButton>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
            {Object.entries(modelGroups).map(([vendor, group]) => (
              <ModelSelectorGroup key={vendor} heading={groupNames[vendor] ?? vendor}>
                {group.map((model) => {
                  const id = model.getKey()
                  const isActive = id === activeModelId
                  const logo = model.provider === 'huggingface' ? 'huggingface' : model.vendor
                  return (
                    <ModelSelectorItem
                      key={id}
                      onSelect={() => {
                        mutate({ chatModel: model.getKey(active.modifiers) })
                        setIsOpen(false);
                      }}
                      value={id}
                    >
                      {logo && <ModelSelectorLogo provider={logo} />}
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      <div className='flex shrink-0 items-center gap-1.5'>
                        {model.thinking && (
                          <label title='Thinking'>
                            <BrainIcon className='size-4' />
                          </label>
                        )}
                        {model.webSearch && (
                          <label title='Web search'>
                            <GlobeIcon className='size-4' />
                          </label>
                        )}
                      </div>
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
        <InputGroupButton
          type="button"
          size='sm'
          variant={active.modifiers.thinking ? 'secondary' : 'ghost'}
          onClick={() => {
            mutate({
              chatModel: activeModel.getKey({
                ...active.modifiers,
                thinking: !active.modifiers.thinking,
              })
            })
          }}
          disabled={disabled}
        >
          <BrainIcon className='size-4' />
          <span>Thinking</span>
        </InputGroupButton>
      )}
      {activeModel.webSearch && (
        <InputGroupButton
          type="button"
          size='sm'
          variant={active.modifiers.websearch ? 'secondary' : 'ghost'}
          onClick={() => {
            mutate({
              chatModel: activeModel.getKey({
                ...active.modifiers,
                websearch: !active.modifiers.websearch,
              })
            })
          }}
          disabled={disabled}
        >
          <GlobeIcon className='size-4' />
          <span>Web search</span>
        </InputGroupButton>
      )}
    </div>
  )
}
