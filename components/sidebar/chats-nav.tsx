import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { unstable_serialize } from "swr/infinite";
import { useRouter } from 'next/navigation'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar, SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import {
  Forward,
  MoreHorizontal,
  Trash2,
  ChevronRight, CircleAlert,
  PencilLine
} from 'lucide-react'
import { toast } from "sonner";

export function SidebarChatsNav() {
  const { isMobile } = useSidebar();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  return (
    <Collapsible
      asChild
      defaultOpen
      className="group/collapsible"
    >
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className='cursor-pointer relative'>
            <span>Chats</span>
            <ChevronRight className="ml-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuAction
                  onClick={(e) => {
                    setShowDeleteAllDialog(true)
                    e.stopPropagation();
                  }}
                  className='text-muted-foreground group-data-[state=closed]/collapsible:hidden'
                >
                  <Trash2 />
                </SidebarMenuAction>
              </TooltipTrigger>
              <TooltipContent align="end" className="hidden md:block">
                Delete All Chats
              </TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>Test Chat</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-44 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <PencilLine className="text-muted-foreground" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward className="text-muted-foreground" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuSkeleton />
            </SidebarMenuItem>
          </SidebarMenu>
          <DeleteChatsDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog} />
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

interface DeleteChatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteChatsDialog({ open, onOpenChange }: DeleteChatsDialogProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(() => 'history-key'));
        router.push("/");
        onOpenChange(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
          <Alert variant='destructive'>
            <CircleAlert />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will permanently delete all your chats from our servers.
              This action cannot be undone.
            </AlertDescription>
          </Alert>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteAll}>
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}