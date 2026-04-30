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

export default function SiteHeader() {
  const serverUser = useUser()
  const [user, setUser]             = useState<User | null>(serverUser)
  const [userTools, setUserTools]   = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || user.user_metadata?.status !== 'approved') {
      // Use a resolved promise so setState is called inside a callback, not synchronously
      Promise.resolve().then(() => setUserTools([]))
      return
    }
    const supabase = createClient()
    supabase
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user.id)
      .then(({ data }) => setUserTools(data?.map(r => r.tool_slug) ?? []))
  }, [user])

  return (
    <>
      <header className="site-header">
        <div className="site-header-left">
          <Link href="/" className="site-header-logo">
            <span className="hidden sm:inline">HOPEFUL MONSTERS.</span>
          </Link>
          <DesktopNav
            userRole={user?.user_metadata?.role}
            userTools={userTools}
            isAuthenticated={!!user}
          />
        </div>

        <div className="site-header-right">
          <ThemeToggle />

          {user ? (
            <div className="hidden sm:flex">
              <SignOutButton />
            </div>
          ) : (
            <>
              <Link href="/login" className="site-header-nav-link hidden sm:inline-flex">
                Sign In
              </Link>
              <Link href="/signup" className="site-header-signup">
                Sign Up
              </Link>
            </>
          )}

          <button
            className="btn-icon flex sm:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="site-header-spacer" aria-hidden />

      <MobileNav
        id="mobile-nav"
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userRole={user?.user_metadata?.role}
        userTools={userTools}
        isAuthenticated={!!user}
      />
    </>
  )
}
