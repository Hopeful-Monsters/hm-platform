import type { Metadata } from 'next'
import { createToolLayout } from '@/components/tool/createToolLayout'
import { WizardProvider } from './_components/WizardContext'
import StepIndicator from './_components/StepIndicator'
import SettingsButton from './_components/SettingsButton'
import '@/app/tool.css'
import './coverage-tracker.css'

export const metadata: Metadata = {
  title:       'Coverage Tracker',
  description: 'Monitor earned media, coverage metrics, and compliance across clients and campaigns in one place.',
  robots:      { index: false, follow: false },
}

export default createToolLayout({
  toolSlug:        'coverage-tracker',
  toolName:        'Coverage Tracker',
  Provider:        WizardProvider,
  subNav:          <StepIndicator />,
  requireApproved: true,
  resolveActions:  role => (role === 'admin' || role === 'editor') ? <SettingsButton /> : null,
})
