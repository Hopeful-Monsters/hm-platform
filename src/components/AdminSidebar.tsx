import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Admin</p>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900">Control Panel</h2>
      </div>
      <nav className="space-y-2">
        <Link href="/admin" className="block rounded-2xl px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
          Dashboard
        </Link>
        <Link href="/admin/approvals" className="block rounded-2xl px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
          Pending Approvals
        </Link>
        <Link href="/admin/users" className="block rounded-2xl px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
          User Management
        </Link>
      </nav>
      {user?.email ? (
        <div className="mt-8 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-semibold text-zinc-900">Signed in as</p>
          <p>{user.email}</p>
        </div>
      ) : null}
    </aside>
  )
}
