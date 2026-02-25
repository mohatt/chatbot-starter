'use client'
import { useEffect } from 'react'
import { config } from '@/lib/config'

interface UsePageTitleOptions {
  title: string | null | undefined
  fallback?: string | boolean
}

export function usePageTitle(options: UsePageTitleOptions) {
  const { title, fallback = true } = options

  useEffect(() => {
    const fallbackTitle = fallback === true ? config.appName : fallback || ''
    const nextTitle = title?.trim() || fallbackTitle
    if (!nextTitle || document.title === nextTitle) {
      return
    }
    document.title = nextTitle
  }, [title, fallback])
}
