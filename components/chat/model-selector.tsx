import { useCallback } from 'react'
import { useClientSettings } from '@/hooks/client-settings'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector'
import { config } from '@/lib/config'

const vendorNames: Record<string, string> = {
  xai: "xAI",
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  huggingface: "Hugging Face",
};

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

export interface ChatModelSelectorProps {
  size?: 'sm' | 'default';
  disabled?: boolean;
}

export function ChatModelSelector({ disabled, size }: ChatModelSelectorProps) {
  const { data, mutate } = useClientSettings()
  const handleChane = useCallback((chatModel: string) => {
    if (!chatModel) return
    mutate({ chatModel })
  }, [mutate])

  const userModel = data?.chatModel
  const activeModel = userModel?.entry ?? defaultModel

  return (
    <div className='flex items-center gap-1'>
      <Select
        name='model'
        onValueChange={handleChane}
        value={models.serialize(activeModel)}
        disabled={disabled}
      >
        <SelectTrigger size={size} title='Select AI Model'>
          <SelectValue placeholder='Select AI Model' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select AI Model</SelectLabel>
          </SelectGroup>
          {Object.entries(modelsByVendor).map(([vendor, group]) => (
            <SelectGroup key={vendor}>
              <SelectLabel>{vendorNames[vendor] ?? vendor}</SelectLabel>
              {group.map((m) => {
                const key = models.serialize(m)
                const logo = m.provider === 'huggingface' ? 'huggingface' : m.vendor
                return (
                  <SelectItem key={key} value={key}>
                    {logo && <ModelSelectorLogo provider={logo} />}
                    {m.name}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 min-h-8 px-2">
        <Switch
          id="thinking-mode"
          checked={userModel?.variant === 'thinking'}
          disabled={disabled || activeModel.thinking !== true}
          onCheckedChange={(checked) => {
            handleChane(models.serialize(activeModel, checked ? 'thinking' : undefined))
          }}
        />
        <Label htmlFor="thinking-mode">Thinking</Label>
      </div>
    </div>
  )
}
