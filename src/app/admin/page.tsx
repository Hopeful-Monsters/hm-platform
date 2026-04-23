import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminCards = [
  {
    href:        '/admin/approvals',
    label:       'Pending Approvals',
    description: 'Review and approve new user requests. Grant tool access per user.',
    accent:      'yellow' as const,
  },
  {
    href:        '/admin/users',
    label:       'User Management',
    description: 'View all users, update tool access, and promote admins.',
    accent:      'pink' as const,
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="admin-content">
      <h1 className="page-heading">Dashboard</h1>

      <div className="card-grid">
        {adminCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className={cn('admin-card card-hover', card.accent === 'pink' ? 'border-l-4 border-l-[var(--pink)]' : 'border-l-4 border-l-[var(--accent)]')}
          >
            <h2 className="admin-card-heading">{card.label}</h2>
            <p className="admin-card-desc">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
