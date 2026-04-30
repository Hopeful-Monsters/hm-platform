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
  authOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/expenses-manager',  label: 'Expenses',  toolSlug: 'expenses-manager' },
  { href: '/coverage-tracker',  label: 'Coverage',  toolSlug: 'coverage-tracker' },
  { href: '/streamtime-reviewer', label: 'Time Analysis', toolSlug: 'streamtime-reviewer' },
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
    <nav className="hidden sm:flex items-center gap-0">
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
  id?: string
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ id, isOpen, onClose, userRole, userTools, isAuthenticated }: MobileNavProps) {
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
            aria-hidden
          />
          <motion.div
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="mobile-nav-panel"
          >
            <div className="mobile-nav-header">
              <span className="eyebrow">Menu</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="btn-icon btn-icon--borderless"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <nav className="mobile-nav-items" aria-label="Mobile navigation">
              {items.map(item => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'block border-l-4 transition-colors duration-150',
                      'font-heading font-black text-xl uppercase tracking-[0.1em] no-underline',
                      'py-3 px-5',
                      isActive
                        ? 'text-[var(--accent)] border-l-[var(--accent)]'
                        : 'text-[var(--text-muted)] border-l-transparent hover:text-[var(--text)] hover:border-l-[var(--border-2)]'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mobile-nav-footer">
              <SignOutButton />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
