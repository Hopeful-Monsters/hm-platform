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

export default function ExpensesManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-tool="expenses-manager">
      <WizardProvider>
        <ToolHeader toolName="Expenses Manager" toolSlug="expenses-manager">
          <StepIndicator />
        </ToolHeader>
        <div className="tool-content">
          {children}
        </div>
      </WizardProvider>
    </div>
  )
}
