import type { Metadata } from 'next'
import ToolHeader from '@/components/ToolHeader'

export const metadata: Metadata = {
  title:       'Expenses Manager',
  description: 'Track, categorise, and report on expenses with detailed analytics. Built for campaign and project-level visibility.',
  robots:      { index: false, follow: false },
}

/**
 * Expenses Manager layout shell.
 *
 * Access gating: proxy.ts enforces auth + tool_access on every request
 * before reaching this layout — no additional DB call needed here.
 *
 * Adding tool sections:
 *   Pass a `tabs` array to <ToolHeader /> as the tool grows:
 *   tabs={[
 *     { href: '/expenses-manager',         label: 'Overview' },
 *     { href: '/expenses-manager/submit',  label: 'Submit' },
 *     { href: '/expenses-manager/reports', label: 'Reports' },
 *   ]}
 */
export default function ExpensesManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
