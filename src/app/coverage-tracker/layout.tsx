import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ToolHeader from '@/components/ToolHeader'

export const metadata: Metadata = {
  title:       'Coverage Tracker',
  description: 'Monitor earned media, coverage metrics, and compliance across clients and campaigns in one place.',
  robots:      { index: false, follow: false },
}

/**
 * Coverage Tracker layout shell.
 *
 * Access gating: proxy.ts handles this before we get here.
 * These checks are defense-in-depth only — no extra DB call needed.
 *
 * Tabs: add entries here as new pages are built.
 *   { href: '/coverage-tracker/history', label: 'History' }  ← future
 *   { href: '/coverage-tracker/reports', label: 'Reports' }  ← future
 */
export default async function CoverageTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.status !== 'approved') redirect('/no-access')

  return (
    <div
      style={{
        minHeight:      'calc(100vh - var(--nav-h))',
        background:     'var(--bg)',
        display:        'flex',
        flexDirection:  'column',
      }}
    >
      <ToolHeader
        toolName="Coverage Tracker"
        toolSlug="coverage-tracker"
        tabs={[
          { href: '/coverage-tracker', label: 'Upload' },
          // { href: '/coverage-tracker/history', label: 'History' },
        ]}
      />
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
