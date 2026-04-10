import type { Metadata } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hopeful Monsters',
  description: 'Tools for culture-led brands.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ErrorBoundary>
          <ThemeProvider defaultTheme="dark">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
