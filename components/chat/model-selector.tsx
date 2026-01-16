import { useCallback } from 'react'
import { useClientSettingsQuery, useClientSettingsMutation } from '@/api/hooks/client'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector'
import { RefreshCcwDotIcon } from 'lucide-react'
import { config } from '@/lib/config'

const vendorNames: Record<string, string> = {
  xai: "xAI",
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  huggingface: "Hugging Face",
};

export const modelsByVendor = config.chat.models.reduce(
  (acc, { id, name, provider }) => {
    const vendor = provider === 'huggingface' ? 'huggingface' : id.split('/')[0]
    const group = vendor ?? 'Unknown'
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push({ id: `${provider}:${id}`, name, logo: vendor });
    return acc;
  },
  {} as Record<string, Array<{ id: string; name: string; logo?: string }>>
);

const autoId = 'auto'

export interface ChatModelSelectorProps {
  size?: 'sm' | 'default';
  disabled?: boolean;
}

export function ChatModelSelector({ disabled, size }: ChatModelSelectorProps) {
  const { data, isLoading: dataLoading } = useClientSettingsQuery()
  const { mutate, isPending: mutationLoading } = useClientSettingsMutation()
  const handleChane = useCallback((value: string) => {
    mutate({ chatModel: value === autoId ? undefined : value })
  }, [])
  return (
    <Select
      name='model'
      onValueChange={handleChane}
      value={data?.chatModel ?? autoId}
      disabled={disabled || dataLoading || mutationLoading}
    >
      <SelectTrigger size={size} title='Select AI Model'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Select AI Model</SelectLabel>
          <SelectItem value={autoId}>
            <RefreshCcwDotIcon className='size-3' />
            Auto
          </SelectItem>
        </SelectGroup>
          {Object.entries(modelsByVendor).map(([vendor, models]) => (
            <SelectGroup key={vendor}>
              <SelectLabel>{vendorNames[vendor] ?? vendor}</SelectLabel>
              {models.map(({ id, name, logo }) => (
                <SelectItem key={id} value={id}>
                  {logo && <ModelSelectorLogo provider={logo} />}
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  )
}
