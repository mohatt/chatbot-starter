import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AccountSettingsCards,
  SecuritySettingsCards,
  SettingsCard,
} from '@daveyplate/better-auth-ui'
import { CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-provider'
import { BadgeCheckIcon, BadgeInfoIcon } from 'lucide-react'

export interface UserAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserAccountDialog({ open, onOpenChange }: UserAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Make changes to your account here.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue='account'>
          <TabsList className='mb-3'>
            <TabsTrigger value='profile'>Profile</TabsTrigger>
            <TabsTrigger value='security'>Security</TabsTrigger>
          </TabsList>
          <TabsContent value='profile' className='max-h-[60vh] overflow-auto'>
            <ReadonlyEmailCard />
            <AccountSettingsCards />
          </TabsContent>
          <TabsContent value='security' className='max-h-[60vh] overflow-auto'>
            <SecuritySettingsCards />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ReadonlyEmailCard() {
  const { user } = useAuth()
  const title = (
    <div className='flex items-center gap-3'>
      <span>Email</span>
      {user.emailVerified ? (
        <Badge variant='secondary' className='bg-blue-500 text-white dark:bg-blue-600'>
          <BadgeCheckIcon />
          Verified
        </Badge>
      ) : (
        <Badge variant='secondary' className='bg-yellow-500 text-white dark:bg-yellow-600'>
          <BadgeInfoIcon />
          Unverified
        </Badge>
      )}
    </div>
  )
  return (
    <SettingsCard
      title={title}
      description='The email address you use to log in.'
      className='mb-4 md:mb-6'
    >
      <CardContent>
        <Input value={user?.email} type='email' disabled />
      </CardContent>
    </SettingsCard>
  )
}
