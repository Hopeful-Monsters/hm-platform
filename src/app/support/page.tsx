import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import SupportForm from './SupportForm'

export const metadata: Metadata = {
  title: 'Support',   // renders as "Support — Hopeful Monsters" via root template
  robots: { index: false, follow: false },
}

export default async function SupportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/support')

  // Derive display name — email signup stores first_name + last_name;
  // Google OAuth typically provides full_name or name.
  const meta = user.user_metadata ?? {}
  const defaultName = (
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    meta.full_name ||
    meta.name ||
    ''
  ).trim()

  return (
    <div className="support-page">
      <p className="eyebrow mb-3">Help</p>
      <h1 className="display-md hm-text mb-3">Get help.</h1>
      <p className="subhead mb-8">
        Submit a support request and we&rsquo;ll get back to you as soon as possible.
      </p>

      <div className="support-divider" />

      <SupportForm defaultName={defaultName} />
    </div>
  )
}
