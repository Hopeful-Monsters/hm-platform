import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const adminCards = [
  {
    href:        '/admin/approvals',
    label:       'Pending Approvals',
    description: 'Review and approve new user requests. Grant tool access per user.',
    accentColor: 'var(--accent)',
  },
  {
    href:        '/admin/users',
    label:       'User Management',
    description: 'View all users, update tool access, and promote admins.',
    accentColor: 'var(--pink)',
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Defense-in-depth — proxy already handles this
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 48,
            textTransform: 'uppercase',
            color: 'var(--text)',
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
          }}
        >
          Dashboard
        </h1>
      </div>

      {/* Card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 2,
        }}
      >
        {adminCards.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                borderLeftWidth: 4,
                borderLeftColor: card.accentColor,
                padding: '28px 24px',
                height: '100%',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 26,
                  textTransform: 'uppercase',
                  color: 'var(--text)',
                  lineHeight: 0.95,
                  marginBottom: 10,
                }}
              >
                {card.label}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65 }}>
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
