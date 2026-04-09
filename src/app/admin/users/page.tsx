import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

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

  revalidatePath('/admin/users')
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users } = await service.auth.admin.listUsers()

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">User Management</h1>
            <p className="text-zinc-600">Review all users and promote trusted accounts to admin.</p>
          </div>
          <a href="/admin/approvals" className="rounded-full border border-zinc-300 bg-zinc-50 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
            Back to Approvals
          </a>
        </div>

        <div className="grid gap-4">
          {users.users.map((u) => (
            <div key={u.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:flex sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="font-semibold">{u.email || 'No email'}</p>
                <p className="text-sm text-zinc-600">Status: {u.user_metadata?.status || 'unknown'}</p>
                <p className="text-sm text-zinc-600">Role: {u.user_metadata?.role || 'user'}</p>
              </div>
              <div className="mt-4 flex gap-2 sm:mt-0">
                {u.user_metadata?.role !== 'admin' ? (
                  <form action={promoteToAdmin} className="flex">
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="rounded-full bg-blue-600 px-5 py-2 text-white hover:bg-blue-700">
                      Promote to Admin
                    </button>
                  </form>
                ) : (
                  <span className="rounded-full bg-green-600 px-5 py-2 text-white">Admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
