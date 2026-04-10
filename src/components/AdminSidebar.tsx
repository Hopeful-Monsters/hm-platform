import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const adminLinks = [
  { href: '/admin',            label: 'Dashboard' },
  { href: '/admin/approvals',  label: 'Approvals' },
  { href: '/admin/users',      label: 'Users' },
]

export default async function AdminSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <aside
      style={{
        background: 'var(--surface)',
        borderRight: '2px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      {/* Sidebar header */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '2px solid var(--border)',
        }}
      >
        <p className="eyebrow" style={{ marginBottom: 8 }}>Control Panel</p>
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 28,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            lineHeight: 0.92,
          }}
        >
          Admin
        </p>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {adminLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'block',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '10px 20px',
              borderLeft: '3px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            className="hover:text-[var(--text)] hover:border-l-[var(--accent)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Signed-in user */}
      {user?.email && (
        <div
          style={{
            padding: '16px 20px',
            borderTop: '2px solid var(--border)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Signed in as
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              wordBreak: 'break-all',
            }}
          >
            {user.email}
          </p>
        </div>
      )}
    </aside>
  )
}
