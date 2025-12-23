import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useUpdateChatMutation } from '@/api/mutations/chats'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getChatUrl } from '@/lib/util'
import { toast } from 'sonner'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { FormDialog, type BaseDialogProps, useDialogState } from '@/components/dialog'
import { LockIcon, GlobeIcon, CopyIcon, CheckIcon } from 'lucide-react'
import type { ChatRecord } from '@/lib/db'

const privacyOptions: Array<{
  id: ChatRecord['privacy'];
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "private",
    label: "Private",
    description: "Only you can access this chat.",
    icon: <LockIcon className='size-5' />,
  },
  {
    id: "public",
    label: "Public",
    description: "Anyone with the link can access this chat.",
    icon: <GlobeIcon className='size-5' />,
  },
];

export interface ChatSettingsDialogProps extends BaseDialogProps {
  chat: ChatRecord;
}

export function ChatSettingsDialog(props: ChatSettingsDialogProps) {
  const { chat, open, onOpenChange } = props;
  const [privacy, setPrivacy] = useState(chat.privacy);
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const { mutate, reset, error, isPending } = useUpdateChatMutation()

  // handle chat object updated due to cache invalidation
  useEffect(() => {
    setPrivacy(chat.privacy)
    reset()
  }, [chat, reset])

  const handleSubmit = () => {
    if(!chat || isPending) return
    if (!privacy || privacy === chat.privacy) {
      onOpenChange(false)
      return
    }

    mutate(
      { id: chat.id, privacy },
      {
        onSuccess: () => {
          onOpenChange(false)
          setTimeout(() => {
            toast.success('Chat settings updated successfully.')
          }, 100);
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      title='Chat Privacy'
      description='Choose who can access this chat.'
      submit='Save'
      error={error && 'Failed to save chat settings.'}
      isPending={isPending}
      isReady={!!privacy && privacy !== chat?.privacy}
    >
      <FieldGroup>
        <FieldSet>
          <RadioGroup name='privacy' value={privacy} onValueChange={setPrivacy as any} required disabled={isPending}>
            {privacyOptions.map(({ id, label, description, icon }) => (
              <FieldLabel htmlFor={`privacy-${id}`} key={id}>
                <Field orientation="horizontal">
                  {icon}
                  <FieldContent>
                    <FieldTitle>{label}</FieldTitle>
                    <FieldDescription>{description}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={id} id={`privacy-${id}`} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          {chat && privacy === 'public' && (
            <Field>
              <InputGroup>
                <InputGroupInput defaultValue={getChatUrl(chat, true)} readOnly />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Copy"
                    title="Copy"
                    size="icon-xs"
                    onClick={() => copyToClipboard(getChatUrl(chat, true))}
                  >
                    {isCopied ? <CheckIcon /> : <CopyIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </FieldSet>
      </FieldGroup>
    </FormDialog>
  )
}

export function useChatSettingsDialog() {
  const { key, isOpen, setIsOpen, open, close } = useDialogState()
  const [chat, setChat] = useState<ChatRecord | null>(null)

  return {
    open: useCallback((target: ChatRecord) => {
      setChat(target)
      open()
    }, [open]),
    close,
    render: () => chat !== null && (
      <ChatSettingsDialog
        key={key}
        open={isOpen}
        onOpenChange={setIsOpen}
        chat={chat}
      />
    )
  }
}
