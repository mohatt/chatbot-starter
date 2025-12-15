import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountSettingsCards, SecuritySettingsCards } from "@daveyplate/better-auth-ui";

export interface UserAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserAccountDialog({ open, onOpenChange }: UserAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Make changes to your account here.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="account">
          <TabsList className='mb-3'>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="max-h-[60vh] overflow-auto">
            <AccountSettingsCards />
          </TabsContent>
          <TabsContent value="security" className="max-h-[60vh] overflow-auto">
            <SecuritySettingsCards />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
