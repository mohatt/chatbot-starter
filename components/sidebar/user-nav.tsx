"use client";
import { ChevronsUpDown, BadgeCheck, LogOut, Palette, Sun, Moon, Monitor } from 'lucide-react'
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

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
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const user = {
    id: 'xxx',
    name: 'Mohamed Elkholy',
    email: 'mkh117@gmail.com',
    image: 'https://avatars.githubusercontent.com/u/16206684?v=4',
  }
  const status = 'ready' as 'ready' | 'loading'
  const isGuest = /^guest-\d+$/.test(user?.email ?? "");
  const signOut = (_: any) => {}

  return (
    <SidebarMenu>
      {status === "loading" ? (
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
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.email ?? "User Avatar"} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.email ?? "User Avatar"} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer">
                  <BadgeCheck />
                  Account
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
                    <DropdownMenuSubContent className='w-48'>
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
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (isGuest) {
                    router.push("/login");
                  } else {
                    signOut({ redirect: true });
                  }
                }}
              >
                <LogOut />
                {isGuest ? "Login to your account" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
