'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/UserProvider'
import ThemeToggle from './ThemeToggle'
import SignOutButton from './SignOutButton'
import { DesktopNav, MobileNav } from './navigation'
import type { User } from '@supabase/supabase-js'

// HM logo mark — circle + spark SVG from brand reference
function HMLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 60 60" fill="none" aria-hidden>
      <circle cx="28" cy="36" r="22" fill="#FFE600" />
      <path d="M44 22 Q50 14 56 8" stroke="#FFE600" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="57" cy="7" r="3" fill="#FF3EBF" />
    </svg>
  )
}

export default function SiteHeader() {
  // Initialise from the server-resolved user passed down via UserProvider.
  // This means the header renders correctly on the first paint without waiting
  // for a client-side getUser() call to complete — eliminating the loading flash.
  const serverUser = useUser()
  const [user, setUser]             = useState<User | null>(serverUser)
  const [userTools, setUserTools]   = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  // Keep user state reactive for sign-in / sign-out events that happen
  // during the session (e.g. signing out updates the nav immediately).
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || user.user_metadata?.status !== 'approved') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserTools([])
      return
    }
    const supabase = createClient()
    supabase
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user.id)
      .then(({ data }) => setUserTools(data?.map(r => r.tool_slug) ?? []))
  }, [user])

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 'var(--nav-h)',
    background: 'var(--bg)',
    borderBottom: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    gap: 16,
  }

  return (
    <>
      <header style={navStyle}>
        {/* Left — logo + desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 17,
              letterSpacing: '0.2em',
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <HMLogo />
            <span className="hidden sm:inline">HOPEFUL MONSTERS.</span>
          </Link>

          <DesktopNav
              userRole={user?.user_metadata?.role}
              userTools={userTools}
              isAuthenticated={!!user}
            />
        </div>

        {/* Right — theme toggle, sign out / auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ThemeToggle />

          {user ? (
            <div className="hidden md:flex">
              <SignOutButton />
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:flex"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                }}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  textDecoration: 'none',
                  padding: '7px 16px',
                  display: 'inline-block',
                }}
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile menu toggle — hidden on desktop */}
          <button
            className="flex md:hidden"
            onClick={() => setMobileOpen(o => !o)}
            style={{
              background: 'none',
              border: '2px solid var(--border-2)',
              color: 'var(--text-muted)',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Spacer to offset fixed header */}
      <div style={{ height: 'var(--nav-h)' }} />

      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userRole={user?.user_metadata?.role}
        userTools={userTools}
        isAuthenticated={!!user}
      />
    </>
  )
}
