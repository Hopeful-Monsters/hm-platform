import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ToolHeader from '@/components/ToolHeader'

/**
 * Expenses Manager layout shell.
 *
 * Access gating: proxy.ts handles this before we get here.
 * These checks are defense-in-depth only — no extra DB call needed.
 *
 * Adding tool sections:
 *   Pass a `tabs` array to <ToolHeader /> as the tool grows:
 *   tabs={[
 *     { href: '/expenses-manager',         label: 'Overview' },
 *     { href: '/expenses-manager/submit',  label: 'Submit' },
 *     { href: '/expenses-manager/reports', label: 'Reports' },
 *   ]}
 */
export default async function ExpensesManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (user.user_metadata?.status !== 'approved') redirect('/auth/no-access')

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--nav-h))',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ToolHeader
        toolName="Expenses Manager"
        toolSlug="expenses-manager"
        // tabs={[]} — add tabs here as pages are built
      />
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
