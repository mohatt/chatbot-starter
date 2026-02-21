import { Fragment, type ReactNode } from 'react'
import { useMediaQuery } from 'usehooks-ts'
import { useSidebar } from '@/components/ui/sidebar'
import { getProjectUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ChatTitle } from './list-item/title'
import { FolderClosedIcon, MenuIcon } from 'lucide-react'
import { GithubIcon } from '../icons'
import Link from 'next/link'
import type { ChatRecord } from '@/lib/db'

export interface ChatHeaderProps {
  chat?: ChatRecord | null
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const { open, isMobile, toggleSidebar } = useSidebar()
  const isPointerFine = useMediaQuery('(pointer: fine)')
  const items: ReactNode[] = []

  if (!open && (isMobile || !isPointerFine)) {
    items.push(
      <BreadcrumbPage>
        <Button className='w-6' onClick={toggleSidebar} variant='ghost' size='icon-sm'>
          <MenuIcon className='size-5' />
          <span className='sr-only'>Open sidebar</span>
        </Button>
      </BreadcrumbPage>,
    )
  }

  if (chat?.projectId) {
    items.push(
      <BreadcrumbLink asChild>
        <Link href={getProjectUrl({ id: chat.projectId })}>
          <FolderClosedIcon className='size-5' />
        </Link>
      </BreadcrumbLink>,
    )
  }

  if (chat) {
    items.push(<ChatTitle chat={chat} showPrivacyIcon />)
  }

  return (
    <header className='sticky top-0 flex items-center gap-2 px-2 py-2'>
      <Breadcrumb className='md:px-2'>
        <BreadcrumbList>
          {items.map((item, index) => (
            <Fragment key={index}>
              <BreadcrumbItem>{item}</BreadcrumbItem>
              {index !== items.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <Button asChild size='sm' className='order-3 hidden md:flex md:ml-auto'>
        <Link href='https://github.com/mohatt/chatbot-starter' rel='noreferrer' target='_noblank'>
          <GithubIcon size={16} />
          View on Github
        </Link>
      </Button>
    </header>
  )
}
