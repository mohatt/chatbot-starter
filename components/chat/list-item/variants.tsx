'use client';
import type { ReactNode, ComponentProps } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useSidebar,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarInput,
} from '@/components/ui/sidebar'
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/loading'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface ChatListItemVariantProps {
  title: ReactNode
  href: string
  menu: ReactNode
  onDoubleClick?: () => void
  isActive?: boolean;
}

export function DefaultVariant({ title, href, menu }: ChatListItemVariantProps) {
  const isMobile = useIsMobile()
  return (
    <DropdownMenu>
      <Item variant="outline" size="sm" asChild>
        <Link href={href}>
          <ItemContent className='min-w-0'>
            <ItemTitle className='w-full'>{title}</ItemTitle>
          </ItemContent>
          <ItemActions className='pointer-fine:opacity-0 group-hover/item:opacity-100 group-has-data-[state=open]/item:opacity-100'>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <MoreHorizontal />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
          </ItemActions>
        </Link>
      </Item>
      <DropdownMenuContent
        className="w-44 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align={isMobile ? "end" : "start"}
      >
        {menu}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SidebarVariant({ title, href, menu, onDoubleClick, isActive }: ChatListItemVariantProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setOpenMobile(false)} isActive={isActive} asChild>
        <Link href={href} onDoubleClick={onDoubleClick}>
          {title}
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction className='pointer-fine:opacity-0 md:opacity-100' showOnHover>
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
        >
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export interface ChatListItemEditVariantProps extends ComponentProps<typeof Input> {
  isPending?: boolean;
}

export function DefaultEditVariant({ isPending, ...inputProps }: ChatListItemEditVariantProps) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle className='w-full'>
          <Input
            {...inputProps}
            className={cn(inputProps.className, 'dark:bg-transparent px-0 h-8 shadow-none border-0')}
          />
        </ItemTitle>
      </ItemContent>
      {isPending && (
        <ItemActions>
          <Button variant="outline" size="icon-sm">
            <LoadingDots />
          </Button>
        </ItemActions>
      )}
    </Item>
  )
}

export function SidebarEditVariant({ isPending, ...inputProps }: ChatListItemEditVariantProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive asChild>
        <SidebarInput {...inputProps} />
      </SidebarMenuButton>
      {isPending && (
        <SidebarMenuAction className='mr-1' asChild>
          <LoadingDots />
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  )
}
