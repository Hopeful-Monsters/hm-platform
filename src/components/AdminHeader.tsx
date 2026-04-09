import Link from 'next/link'
import SignOutButton from './SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function AdminHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b border-zinc-200 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/admin" className="text-lg font-semibold hover:text-slate-200">
            Admin Dashboard
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <Link href="/admin/approvals" className="hover:text-white">
              Approvals
            </Link>
            <Link href="/admin/users" className="hover:text-white">
              Users
            </Link>
            <Link href="/" className="hover:text-white">
              Site Home
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user?.email && <span className="text-sm text-slate-300">{user.email}</span>}
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
