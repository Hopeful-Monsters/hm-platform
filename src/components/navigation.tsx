'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import SignOutButton from './SignOutButton'

interface NavItem {
  href: string
  label: string
  adminOnly?: boolean
  toolSlug?: string
  /** Show only when a user is authenticated (any status) */
  authOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/',                  label: 'Home' },
  { href: '/expenses-manager',  label: 'Expenses',  toolSlug: 'expenses-manager' },
  { href: '/coverage-tracker',  label: 'Coverage',  toolSlug: 'coverage-tracker' },
  { href: '/support',           label: 'Support',   authOnly: true },
  { href: '/admin',             label: 'Admin',     adminOnly: true },
]

interface NavProps {
  userRole?: string
  userTools: string[]
  isAuthenticated?: boolean
}

function filterItems(
  items: NavItem[],
  userRole?: string,
  userTools: string[] = [],
  isAuthenticated = false
) {
  return items.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false
    if (item.toolSlug && !userTools.includes(item.toolSlug)) return false
    if (item.authOnly && !isAuthenticated) return false
    return true
  })
}

export function DesktopNav({ userRole, userTools, isAuthenticated }: NavProps) {
  const pathname = usePathname()
  const items = filterItems(navItems, userRole, userTools, isAuthenticated)

  return (
    <nav className="hidden md:flex items-center gap-0">
      {items.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'label-nav px-4 py-2 transition-colors duration-150',
              isActive
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text)] border-b-2 border-transparent'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

interface MobileNavProps extends NavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose, userRole, userTools, isAuthenticated }: MobileNavProps) {
  const pathname = usePathname()
  const items = filterItems(navItems, userRole, userTools, isAuthenticated)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 999,
              width: 280,
              background: 'var(--surface)',
              borderLeft: '2px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Mobile nav header */}
            <div
              style={{
                height: 'var(--nav-h)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                borderBottom: '2px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <span className="eyebrow" style={{ color: 'var(--accent-label)' }}>Menu</span>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile nav items */}
            <nav style={{ padding: '16px 0', flex: 1 }}>
              {items.map(item => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'block',
                      padding: '12px 20px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: 20,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      borderLeft: isActive ? '4px solid var(--accent)' : '4px solid transparent',
                      textDecoration: 'none',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Sign Out at bottom */}
            <div
              style={{
                borderTop: '2px solid var(--border)',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}
            >
              <SignOutButton />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
