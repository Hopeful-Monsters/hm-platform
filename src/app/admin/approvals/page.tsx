import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

async function approveUser(formData: FormData) {
  'use server'
  const userId = formData.get('userId') as string
  const service = createServiceClient()

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { status: 'approved' }
  })

  await service.from('tool_access').insert([
    { user_id: userId, tool_slug: 'coverage-tracker', plan: 'basic' },
    { user_id: userId, tool_slug: 'expenses-manager', plan: 'basic' }
  ])

  const { data: userData } = await service.auth.admin.getUserById(userId)
  if (userData.user?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'noreply@hopefulmonsters.com.au',
      to: userData.user.email,
      subject: 'Account Approved',
      text: 'Your account has been approved. You can now access the tools at hopefulmonsters.com.au'
    })
  }

  revalidatePath('/admin/approvals')
}

async function promoteToAdmin(formData: FormData) {
  'use server'
  const userId = formData.get('userId') as string
  const service = createServiceClient()
  const { data: userData } = await service.auth.admin.getUserById(userId)

  const existingMetadata = userData.user?.user_metadata ?? {}
  await service.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      role: 'admin'
    }
  })

  if (userData.user?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'noreply@hopefulmonsters.com.au',
      to: userData.user.email,
      subject: 'Admin Access Granted',
      text: 'You have been granted administrator access on hopefulmonsters.com.au.'
    })
  }

  revalidatePath('/admin/approvals')
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users } = await service.auth.admin.listUsers()
  const pendingUsers = users.users.filter((u) => u.user_metadata?.status === 'pending')
  const nonAdminUsers = users.users.filter((u) => u.user_metadata?.role !== 'admin')

  return (
    <div className="p-8 space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <p className="text-zinc-600">Approve users and manage role access.</p>
        </div>
        <a href="/admin" className="rounded-full border border-zinc-300 bg-zinc-50 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
          Admin Home
        </a>
      </div>
      <section>
        <h2 className="text-2xl font-bold mb-4">Pending Approvals</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-zinc-600">No users are currently waiting for approval.</p>
        ) : (
          <ul className="space-y-4">
            {pendingUsers.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 rounded-xl bg-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{u.email}</p>
                  <p className="text-sm text-zinc-600">Status: {u.user_metadata?.status || 'unknown'}</p>
                </div>
                <form action={approveUser} className="flex gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <button type="submit" className="rounded-full bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                    Approve
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">User Roles</h2>
        <p className="mb-4 text-zinc-600">Promote trusted users to admin so they can manage approvals and access.</p>
        <ul className="space-y-4">
          {nonAdminUsers.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 rounded-xl bg-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{u.email}</p>
                <p className="text-sm text-zinc-600">Status: {u.user_metadata?.status || 'unknown'}</p>
                <p className="text-sm text-zinc-600">Role: {u.user_metadata?.role || 'user'}</p>
              </div>
              <form action={promoteToAdmin} className="flex gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <button type="submit" className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  Make Admin
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
