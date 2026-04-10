'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from './SignOutButton'
import ThemeToggle from './ThemeToggle'
import { Button } from './ui/button'
import { MobileNav, DesktopNav } from './navigation'

export default function SiteHeader() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Get user's tool access for navigation filtering
  const [userTools, setUserTools] = useState<string[]>([])
  useEffect(() => {
    if (user && user.user_metadata?.status === 'approved') {
      const getUserTools = async () => {
        const supabase = createClient()
        const { data: toolAccess } = await supabase
          .from('tool_access')
          .select('tool_slug')
          .eq('user_id', user.id)
        setUserTools(toolAccess?.map(access => access.tool_slug) || [])
      }
      getUserTools()
    }
  }, [user])

  if (loading) {
    return (
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 animate-pulse rounded bg-muted"></div>
          </div>
          <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted"></div>
        </div>
      </header>
    )
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container flex h-16 max-w-screen-2xl items-center px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="h-8 w-8 rounded bg-primary"></div>
              <span className="hidden sm:inline">Hopeful Monsters</span>
            </Link>

            <DesktopNav userRole={user?.user_metadata?.role} userTools={userTools} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <>
                <div className="hidden items-center gap-2 md:flex">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                    {user.user_metadata?.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                  {user.user_metadata?.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm">
                        Admin
                      </Button>
                    </Link>
                  )}
                </div>
                <SignOutButton />
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userRole={user?.user_metadata?.role}
        userTools={userTools}
      />
    </>
  )
}
