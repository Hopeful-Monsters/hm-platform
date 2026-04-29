import type { Metadata } from 'next'
import { createToolLayout } from '@/components/tool/createToolLayout'
import { WizardProvider } from './_components/WizardContext'
import StepIndicator from './_components/StepIndicator'
import '@/app/tool.css'
import './expenses-manager.css'

export const metadata: Metadata = {
  title:       'Expenses Manager',
  description: 'Track, categorise, and report on expenses with detailed analytics. Built for campaign and project-level visibility.',
  robots:      { index: false, follow: false },
}

export default createToolLayout({
  toolSlug: 'expenses-manager',
  toolName: 'Expenses Manager',
  Provider: WizardProvider,
  subNav:   <StepIndicator />,
})
