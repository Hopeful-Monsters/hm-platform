import type { Metadata } from 'next'
import { createToolLayout } from '@/components/tool/createToolLayout'
import '@/app/tool.css'
import './paid-our-worth.css'

export const metadata: Metadata = {
  title:       'Paid Our Worth',
  description: 'Weekly billable time vs revenue tracker per client job.',
  robots:      { index: false, follow: false },
}

export default createToolLayout({
  toolSlug:        'paid-our-worth',
  toolName:        'Paid Our Worth',
  requireApproved: true,
})
