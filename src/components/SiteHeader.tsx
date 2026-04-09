import Link from 'next/link'
import SignOutButton from './SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function SiteHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-zinc-900">
            Hopeful Monsters
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-zinc-600 md:flex">
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <Link href="/expenses-manager" className="hover:text-zinc-900">
              Expenses
            </Link>
            <Link href="/coverage-tracker" className="hover:text-zinc-900">
              Coverage
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 md:inline-flex">
                {user.user_metadata?.status === 'approved' ? 'Approved' : 'Pending'}
              </span>
              {user.user_metadata?.role === 'admin' && (
                <Link href="/admin" className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                  Admin
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="rounded-full border border-blue-600 bg-blue-50 px-4 py-2 text-sm text-blue-600 hover:bg-blue-100">
                Sign In
              </Link>
              <Link href="/auth/signup" className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
