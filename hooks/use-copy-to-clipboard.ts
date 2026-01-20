"use client"
import { useState, useCallback } from "react"
import { toast } from 'sonner'

export interface UseCopyToClipboardProps {
  timeout?: number
  toast?: boolean
  onCopy?: () => void
}

export function useCopyToClipboard(props?: UseCopyToClipboardProps) {
  const { timeout = 2000, onCopy, toast: showToast } = props ?? {}
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(async (value: string) => {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      onCopy?.()
      if (showToast) {
        toast.success('Copied to clipboard')
      }
      setTimeout(() => {
        setIsCopied(false)
      }, timeout)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
      console.error(error)
    }
  }, [timeout, onCopy])

  return { isCopied, copyToClipboard }
}
