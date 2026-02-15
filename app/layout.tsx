import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ToasterProvider } from '@/components/toaster-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAG Chatbot',
  description: 'Docs in, answers out — powered by Next.js, Vercel AI SDK, and Postgres.',
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
