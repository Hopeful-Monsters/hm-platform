import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-zinc-900 mb-4">Admin Dashboard</h1>
        <p className="mb-8 text-zinc-600">Manage pending approvals, user roles, and platform access.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/admin/approvals" className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 transition hover:border-zinc-300 hover:bg-white">
            <h2 className="text-xl font-semibold">Pending Approvals</h2>
            <p className="mt-2 text-zinc-600">Review and approve new user requests.</p>
          </Link>
          <Link href="/admin/users" className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 transition hover:border-zinc-300 hover:bg-white">
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="mt-2 text-zinc-600">View users, inspect roles, and promote admins.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
