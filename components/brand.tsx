import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppBrandLogoProps {
  className?: string
  glyphClassName?: string
}

export function AppBrandLogo(props: AppBrandLogoProps) {
  const { className, glyphClassName } = props
  return (
    <span
      className={cn(
        'bg-sidebar-primary text-sidebar-primary-foreground',
        'inline-flex aspect-square size-8 items-center justify-center rounded-lg',
        className,
      )}
    >
      <Sparkles className={cn('size-4', glyphClassName)} />
    </span>
  )
}
