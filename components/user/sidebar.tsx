'use client'
import { useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/components/auth-provider'
import { useUserBillingPeriodQuery } from '@/api-client/hooks/user'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  useSidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserView } from '@daveyplate/better-auth-ui'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingDots } from '@/components/loading'
import {
  ChevronsUpDown,
  BadgeCheck,
  LogIn,
  LogOut,
  Palette,
  Sun,
  Moon,
  Monitor,
  UserRoundPlus,
  Coins,
} from 'lucide-react'
import { UserAccountDialog } from './dialogs/account'
import Link from 'next/link'

const themes = [
  {
    key: 'system',
    icon: Monitor,
    label: 'System',
  },
  {
    key: 'light',
    icon: Sun,
    label: 'Light',
  },
  {
    key: 'dark',
    icon: Moon,
    label: 'Dark',
  },
]

export function UserSidebar() {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { user, isPending } = useAuth()
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  return (
    <>
      <SidebarMenu>
        {isPending ? (
          <SidebarMenuItem>
            <div
              data-slot='sidebar-menu-skeleton'
              data-sidebar='menu-skeleton'
              className='flex items-center gap-2 rounded-md px-2'
            >
              <Skeleton className='size-8 rounded-lg' />
              <div className='grid flex-1 gap-2'>
                <Skeleton className='h-3 max-w-3/4' />
                <Skeleton className='h-3 max-w-2/4' />
              </div>
            </div>
          </SidebarMenuItem>
        ) : user ? (
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <UserView user={user} isPending={isPending} />
                  <ChevronsUpDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side={isMobile ? 'bottom' : 'right'}
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='px-1 py-1.5 font-normal'>
                  <UserView user={user} isPending={isPending} />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className='w-full' asChild>
                    {user.isAnonymous ? (
                      <Link href='/auth/sign-up'>
                        <UserRoundPlus />
                        Sign Up
                      </Link>
                    ) : (
                      <button onClick={() => setIsAccountOpen(true)}>
                        <BadgeCheck />
                        Account
                      </button>
                    )}
                  </DropdownMenuItem>
                  <UserChatCredits />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette />
                      <span className='grow'>Theme</span>
                      <span className='text-muted-foreground'>
                        {themes.find((t) => t.key === theme)?.label ?? theme}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className='w-48' sideOffset={4}>
                        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                          {themes.map(({ key, icon: Icon, label }) => (
                            <DropdownMenuRadioItem key={key} value={key}>
                              <Icon /> {label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    {user.isAnonymous ? (
                      <Link href='/auth/sign-in'>
                        <LogIn />
                        Sign in to your account
                      </Link>
                    ) : (
                      <Link href='/auth/sign-out'>
                        <LogOut />
                        Sign Out
                      </Link>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton className='h-12 px-4 text-destructive' variant='outline'>
              Failed loading user session
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <UserAccountDialog open={isAccountOpen} onOpenChange={setIsAccountOpen} />
      </SidebarMenu>
    </>
  )
}

function UserChatCredits() {
  const { data, isLoading, error } = useUserBillingPeriodQuery()

  const credits = useMemo(() => {
    if (!data) return null
    const { remaining, max } = data.chatCredits
    const fmt = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
    return {
      limit: fmt.format(max),
      remaining: fmt.format(remaining > 0 ? Math.max(remaining, 0.01) : 0),
      resetDate: new Date(data.endDate).toLocaleString(undefined, {
        dateStyle: 'medium',
      }),
    }
  }, [data])

  return (
    <DropdownMenuItem className='w-full' asChild>
      <button disabled={!!error}>
        <Coins />
        <span>Chat credits</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='ml-auto'>
              {isLoading && <LoadingDots />}
              {error && <span className='text-destructive'>Error</span>}
              {credits && (
                <span className='text-muted-foreground'>
                  {credits.remaining === credits.limit
                    ? credits.remaining
                    : `${credits.remaining} / ${credits.limit}`}
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent hidden={isLoading} align='start' className='hidden md:block'>
            {error && 'Error loading chat credits'}
            {credits && <>Resets on {credits.resetDate}</>}
          </TooltipContent>
        </Tooltip>
      </button>
    </DropdownMenuItem>
  )
}
