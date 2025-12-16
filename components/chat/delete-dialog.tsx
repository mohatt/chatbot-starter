import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog, ConfirmDialogProps } from '@/components/confirm-dialog'
import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatRecord, ChatProjectRecord } from '@/lib/db'

export interface DeleteChatsDialogProps extends Pick<ConfirmDialogProps, 'open' | 'onOpenChange'> {
  onDelete?: () => void | Promise<void>;
  project?: Pick<ChatProjectRecord, 'id' | 'name'>;
}

export function DeleteAllChatsDialog(props: DeleteChatsDialogProps) {
  const { open, onOpenChange, onDelete, project } = props;
  const router = useRouter();
  const handleDeleteAll = () => {
    const query = project ? `?projectId=${project.id}` : '';
    const deletePromise = fetch(`/api/chat/history${query}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: async () => {
        await onDelete?.();
        router.push("/");
        onOpenChange(false);
        return "All chats deleted successfully.";
      },
      error: "Failed to delete all chats.",
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Delete all chats?'
      confirm='Delete All'
      onConfirm={handleDeleteAll}
      destructive
    >
      <Alert variant='destructive'>
        <CircleAlert />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          <p>
            This will permanently delete all your chats{' '}
            {project ? <>under <b>{project.name}{' '}</b> project</> : ''}
            and their history from our servers.
            This action cannot be undone.
          </p>
        </AlertDescription>
      </Alert>
    </ConfirmDialog>
  )
}

export interface DeleteChatDialogProps {
  open: ChatRecord | null;
  onOpenChange: (open: ChatRecord | null) => void;
  onDelete?: () => void | Promise<void>;
}

export function DeleteChatDialog(props: DeleteChatDialogProps) {
  const { open, onOpenChange, onDelete } = props;
  const router = useRouter();
  const handleDelete = () => {
    const deletePromise = fetch(`/api/chat/${open?.id}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: async () => {
        await onDelete?.();
        router.replace("/");
        onOpenChange(null);
        return "Chat deleted successfully.";
      },
      error: "Failed to delete chat.",
    });
  };

  return (
    <ConfirmDialog
      open={!!open}
      onOpenChange={() => onOpenChange(null)}
      title='Delete chat?'
      onConfirm={handleDelete}
      destructive
    >
      This will delete <b>{open?.title}</b>.
    </ConfirmDialog>
  )
}
