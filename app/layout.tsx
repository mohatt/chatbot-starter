import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { ToasterProvider } from '@/components/toaster-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { config } from '@/lib/config'
import './globals.css'

export const metadata: Metadata = {
  title: config.appName,
  description: config.appDescription,
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // `next-themes` injects an extra classname to the body element to avoid
    // visual flicker before hydration
    <html lang='en' suppressHydrationWarning>
      <body className='antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          disableTransitionOnChange
          enableSystem
        >
          <ToasterProvider position='top-center' />
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
