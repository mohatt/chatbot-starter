'use client';
import { useRef } from 'react';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools, usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
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
import { PaperclipIcon } from 'lucide-react';
import type { UseChatResult } from './hooks'

const models = [
  { id: 'gpt-4o', name: 'GPT-4o', logo: 'openai' },
  { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus', logo: 'openai' },
];

function PromptInputAttachmentButton({ disabled }: { disabled?: boolean }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton title='Attach content' disabled={disabled} onClick={() => attachments.openFileDialog()}>
      <PaperclipIcon size={16} />
    </PromptInputButton>
  )
}

export interface ChatPromptProps extends Pick<UseChatResult, 'sendMessage' | 'stop' | 'status'> {
  chatId: string;
  input: string
  model: string
  setInput: (value: string) => void
  setModel: (value: string) => void
  isEphemeral?: boolean
}

export const ChatPrompt = (props: ChatPromptProps) => {
  const { chatId, input, model, setInput, setModel, sendMessage, status, isEphemeral } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim()
    if (!text) {
      return;
    }
    void sendMessage({ text });
    setInput('');
  };
  const isSubmitDisabled = !input.trim() || status !== 'ready';
  return (
    <div className="size-full mt-4">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            placeholder='What’s on your mind today?'
            ref={textareaRef}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputAttachmentButton disabled={status !== 'ready'} />
            <Select
              onValueChange={(value) => {
                setModel(value);
              }}
              value={model}
            >
              <SelectTrigger size='sm' title='Select AI Model' disabled={status !== 'ready'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Select AI Model</SelectLabel>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <ModelSelectorLogo provider={model.logo} />
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </PromptInputTools>
          <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};
