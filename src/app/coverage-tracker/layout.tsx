import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ToolHeader from '@/components/ToolHeader'
import { WizardProvider } from './_components/WizardContext'
import StepIndicator from './_components/StepIndicator'
import SettingsButton from './_components/SettingsButton'
import './coverage-tracker.css'

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
 * Sub-nav: the 4-step wizard indicator replaces the tab links — the old
 * "Upload" tab was redundant because the wizard already starts on upload.
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

  const role = user.user_metadata?.role as string | undefined
  const canEditSettings = role === 'admin' || role === 'editor'

  return (
    <div
      data-tool="coverage-tracker"
      style={{
        minHeight:      'calc(100vh - var(--nav-h))',
        background:     'var(--bg)',
        display:        'flex',
        flexDirection:  'column',
      }}
    >
      <WizardProvider>
        <ToolHeader
          toolName="Coverage Tracker"
          toolSlug="coverage-tracker"
          actions={canEditSettings ? <SettingsButton /> : undefined}
        >
          <StepIndicator />
        </ToolHeader>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </WizardProvider>
    </div>
  )
}
