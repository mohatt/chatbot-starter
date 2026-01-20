import { useEffect, useState, type ReactNode } from 'react'
import { Carousel, CarouselContent, type CarouselApi } from '@/components/ui/carousel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, ArrowRightIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface SourcesProps {
  children: ReactNode
  className?: string
}

export function Sources({ children, className }: SourcesProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className={cn('group inline items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Badge className="hover:bg-secondary/80" variant='secondary' asChild>
            <button type='button'>Sources</button>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="relative w-80 p-0" align='start' side='top'>
          <Carousel className="w-full" setApi={setApi}>
            <div className="flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2">
              <button
                type="button"
                className="shrink-0"
                aria-label="Previous"
                onClick={() => api?.scrollPrev()}
              >
                <ArrowLeftIcon className="size-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                className="shrink-0"
                aria-label="Next"
                onClick={() => api?.scrollNext()}
              >
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              </button>
              <div className="flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs">
                {current}/{count}
              </div>
            </div>
            <CarouselContent>
              {children}
            </CarouselContent>
          </Carousel>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export interface SourceUrlItem {
  url: string
  title?: string | null
}

export interface SourceFileItem {
  id: string
  name: string
  mimeType: string
  url?: string | null
}

export interface SourceItemProps {
  item: SourceUrlItem | SourceFileItem
  className?: string
}

function extractSourceProps(item: SourceUrlItem | SourceFileItem) {
  // Rendering logic for file items
  if ('id' in item) {
    const title = item.name
    let subtitle: ReactNode = null
    let description: ReactNode = item.mimeType
    const isImage = item.mimeType.startsWith('image/');
    if (item.url) {
      if (isImage) {
        subtitle = item.mimeType
        description = <img src={item.url} alt={title} width={128} height={128} />
      } else {
        subtitle = (
          <Link
            className="flex items-center gap-2 hover:underline"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            <span>Open</span>
            <SquareArrowOutUpRightIcon className='size-3' />
          </Link>
        )
      }
    }
    return { title, subtitle, description }
  }

  return {
    title: item.title || item.url,
    subtitle: (
      <Link
        className="flex items-center gap-2 hover:underline"
        href={item.url}
        rel="noreferrer"
        target="_blank"
      >
        <span>{new URL(item.url).hostname}</span>
        <SquareArrowOutUpRightIcon className='size-3' />
      </Link>
    ),
    description: (item.title?.length ?? 0) > 40 ? item.title : undefined,
  }
}

export function SourceItem({ item, className }: SourceItemProps) {
  const { title, subtitle, description } = extractSourceProps(item);
  return (
    <div className={cn("min-w-full space-y-2 p-4 pl-8", className)}>
      <div className='space-y-1'>
        <h4 className="truncate font-medium text-sm leading-tight">{title}</h4>
        {subtitle && (
          <p className="truncate break-all text-muted-foreground text-xs">{subtitle}</p>
        )}
        {description && <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>}
      </div>
    </div>
  )
}
