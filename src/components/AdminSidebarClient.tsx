'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminLinks = [
  { href: '/admin',           label: 'Dashboard' },
  { href: '/admin/approvals', label: 'Approvals' },
  { href: '/admin/users',     label: 'Users' },
]

export default function AdminSidebarClient({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar-header">
        <p className="eyebrow mb-2">Control Panel</p>
        <p className="admin-sidebar-heading">Admin</p>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin pages">
        {adminLinks.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'admin-sidebar-link',
                isActive && 'admin-sidebar-link--active'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {userEmail && (
        <div className="admin-sidebar-footer">
          <p className="admin-sidebar-footer-label">Signed in as</p>
          <p className="admin-sidebar-footer-email">{userEmail}</p>
        </div>
      )}
    </aside>
  )
}
