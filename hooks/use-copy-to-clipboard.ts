"use client"
import { useState, useCallback } from "react"

export interface UseCopyToClipboardProps {
  timeout?: number
  onCopy?: () => void
}

export function useCopyToClipboard({ timeout = 2000, onCopy }: UseCopyToClipboardProps = {}) {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback((value: string) => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      return
    }

    if (!value) return

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true)

      if (onCopy) {
        onCopy()
      }

      if (timeout !== 0) {
        setTimeout(() => {
          setIsCopied(false)
        }, timeout)
      }
    }, console.error)
  }, [timeout, onCopy])

  return { isCopied, copyToClipboard }
}
