import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ToolHeader from '@/components/ToolHeader'
import SettingsButton from './_components/SettingsButton'
import '@/app/tool.css'
import './streamtime-reviewer.css'

export const metadata: Metadata = {
  title: 'Streamtime Reviewer',
  description: 'Review weekly time entries, billable rates, and team performance from Streamtime.',
  robots: { index: false, follow: false },
}

export default async function StreamtimeReviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.status !== 'approved') redirect('/no-access')

  const isAdmin = user.user_metadata?.role === 'admin'

  return (
    <div data-tool="streamtime-reviewer">
      <ToolHeader
        toolName="Streamtime Reviewer"
        toolSlug="streamtime-reviewer"
        actions={isAdmin ? <SettingsButton /> : undefined}
      />
      <div className="tool-content">
        {children}
      </div>
    </div>
  )
}
