"use client"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  AlertCircleIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster, ToasterProps } from "sonner"

const icons = {
  success: <CircleCheckIcon className="size-5" />,
  info: <InfoIcon className="size-5" />,
  warning: <TriangleAlertIcon className="size-5" />,
  error: <AlertCircleIcon className="size-5 text-destructive" />,
  loading: <Loader2Icon className="size-5 animate-spin" />,
}

const style = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties

export function ToasterProvider(props: ToasterProps) {
  const { theme = "system" } = useTheme()
  return (
    <Toaster
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={icons}
      style={style}
      {...props}
    />
  )
}
