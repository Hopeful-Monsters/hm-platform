import type { Metadata } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { headers } from 'next/headers'
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

// Resolves relative image URLs in metadata (OG images, icons, etc.)
// Set NEXT_PUBLIC_SITE_URL in your environment variables (e.g. https://platform.hopefulmonsters.com.au).
// Falls back to the Vercel deployment URL in preview/production, then localhost in dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default:  'Hopeful Monsters',
    template: '%s — Hopeful Monsters',
  },
  description: 'Tools for culture-led brands.',

  openGraph: {
    type:        'website',
    siteName:    'Hopeful Monsters',
    title:       'Hopeful Monsters',
    description: 'Tools for culture-led brands.',
    // opengraph-image.tsx in this directory is picked up automatically
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Hopeful Monsters',
    description: 'Tools for culture-led brands.',
  },
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

  // Read the per-request CSP nonce set by proxy.ts and pass it to ThemeProvider
  // so the anti-FOUC inline script can be executed under the strict CSP policy.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <ErrorBoundary>
          <ThemeProvider defaultTheme="dark" nonce={nonce}>
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
