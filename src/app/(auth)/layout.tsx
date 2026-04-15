import type { Metadata } from 'next'

// Auth routes are not indexable — no OG, no crawling.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
