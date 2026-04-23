import type { Metadata } from 'next'
import '@/app/tool.css'
import ToolHeader from '@/components/ToolHeader'
import { WizardProvider } from './_components/WizardContext'
import StepIndicator from './_components/StepIndicator'
import './expenses-manager.css'

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
 * Sub-nav: the 3-step wizard indicator (Select Job → Upload → Review) lives
 * inside the ToolHeader, matching the coverage-tracker pattern. Step 4
 * (Success) is a post-submit outcome screen and doesn't appear in the
 * indicator.
 */
export default function ExpensesManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      data-tool="expenses-manager"
      style={{
        minHeight:     'calc(100vh - var(--nav-h))',
        background:    'var(--bg)',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      <WizardProvider>
        <ToolHeader toolName="Expenses Manager" toolSlug="expenses-manager">
          <StepIndicator />
        </ToolHeader>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </WizardProvider>
    </div>
  )
}
