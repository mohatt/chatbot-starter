"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from '@/components/auth-provider'
import {
  DropdownMenu,
  DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { UserView } from "@daveyplate/better-auth-ui";
import { ChevronsUpDown, BadgeCheck, LogIn, LogOut, Palette, Sun, Moon, Monitor, UserRoundPlus } from 'lucide-react'
import Link from 'next/link'
import { UserAccountDialog } from './user-account-dialog'

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
];

export function SidebarUserNav() {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user, isPending } = useAuth()
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        {isPending ? (
          <SidebarMenuItem>
            <div
              data-slot="sidebar-menu-skeleton"
              data-sidebar="menu-skeleton"
              className='flex items-center gap-2 rounded-md px-2'
            >
              <Skeleton className="size-8 rounded-lg" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-3 max-w-3/4" />
                <Skeleton className="h-3 max-w-2/4" />
              </div>
            </div>
          </SidebarMenuItem>
        ) : (
          user ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <UserView user={user} isPending={isPending} />
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="px-1 py-1.5 font-normal">
                    <UserView user={user} isPending={isPending} />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="w-full cursor-pointer" asChild>
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
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Palette />
                        <span>Theme:</span>
                        <span className='text-muted-foreground'>
                          {themes.find((t) => t.key === theme)?.label ?? theme}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className='w-48' sideOffset={4}>
                          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                            {themes.map(({ key, icon: Icon, label }) => (
                              <DropdownMenuRadioItem key={key} value={key} className='cursor-pointer'>
                                <Icon /> {label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" asChild>
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
          )
        )}
        <UserAccountDialog open={isAccountOpen} onOpenChange={setIsAccountOpen}/>
      </SidebarMenu>
    </>
  );
}
