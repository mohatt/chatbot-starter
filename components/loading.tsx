import { cn } from '@/lib/utils'

export interface LoadingDotsProps {
  message?: string
  className?: string
}

export function LoadingDots(props: LoadingDotsProps) {
  const { message, className } = props
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {message && <span className='animate-pulse'>{message}</span>}
      <span className='inline-flex'>
        <span className='animate-bounce transform-gpu will-change-transform [animation-delay:-300ms]'>
          .
        </span>
        <span className='animate-bounce transform-gpu will-change-transform [animation-delay:-150ms]'>
          .
        </span>
        <span className='animate-bounce transform-gpu will-change-transform [animation-delay:0ms]'>
          .
        </span>
      </span>
    </div>
  )
}
