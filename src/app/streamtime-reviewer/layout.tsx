import type { Metadata } from 'next'
import { createToolLayout } from '@/components/tool/createToolLayout'
import SettingsButton from './_components/SettingsButton'
import '@/app/tool.css'
import './streamtime-reviewer.css'

export const metadata: Metadata = {
  title:       'Streamtime Reviewer',
  description: 'Review weekly time entries, billable rates, and team performance from Streamtime.',
  robots:      { index: false, follow: false },
}

export default createToolLayout({
  toolSlug:        'streamtime-reviewer',
  toolName:        'Streamtime Reviewer',
  requireApproved: true,
  resolveActions:  role => role === 'admin' ? <SettingsButton /> : null,
})
