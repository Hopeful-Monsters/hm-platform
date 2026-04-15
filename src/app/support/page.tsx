import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupportForm from './SupportForm'

export const metadata = {
  title:  'Support',   // renders as "Support — Hopeful Monsters" via root template
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
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '56px 24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p
          className="eyebrow"
          style={{ marginBottom: 12, color: 'var(--accent-label)' }}
        >
          Support
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(48px, 8vw, 72px)',
            textTransform: 'uppercase',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            marginBottom: 20,
          }}
        >
          Get help.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            maxWidth: 720,
          }}
        >
          Report a bug, request a feature, or ask a question. All submissions go
          directly to our issue tracker and are reviewed by the team.
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 2,
          background: 'var(--border)',
          marginBottom: 40,
        }}
      />

      <SupportForm defaultName={defaultName} />
    </main>
  )
}
