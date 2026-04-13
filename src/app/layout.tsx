import type { Metadata } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { UserProvider } from '@/components/UserProvider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { getCurrentUser } from '@/lib/auth'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

// Weight 900 dropped — all 900-weight usage targets var(--font-heading)
// (Barlow Condensed). Inter only needs 400/500/600/700 for body and UI copy.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
  // Resolve the user once at the layout level. React's cache() ensures any
  // Server Component further down the tree (e.g. page.tsx) that also calls
  // getCurrentUser() gets the memoised result — no second network round-trip.
  const user = await getCurrentUser()

  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ErrorBoundary>
          <ThemeProvider defaultTheme="dark">
            <UserProvider user={user}>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </UserProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
