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

async function updateToolAccess(formData: FormData) {
  'use server'
  const userId = formData.get('userId') as string
  const selectedTools = formData.getAll('tools') as string[]

  const service = createServiceClient()

  // Remove all existing tool access for this user
  await service.from('tool_access').delete().eq('user_id', userId)

  // Add new tool access
  if (selectedTools.length > 0) {
    const toolInserts = selectedTools.map(toolSlug => ({
      user_id: userId,
      tool_slug: toolSlug,
      plan: 'basic'
    }))
    await service.from('tool_access').insert(toolInserts)
  }

  revalidatePath('/admin/users')
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users } = await service.auth.admin.listUsers()
  const { data: toolAccessData } = await service.from('tool_access').select('*')

  // Create a map of user_id -> tools
  const userToolsMap = new Map()
  toolAccessData?.forEach(access => {
    if (!userToolsMap.has(access.user_id)) {
      userToolsMap.set(access.user_id, [])
    }
    userToolsMap.get(access.user_id).push(access.tool_slug)
  })

  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">User Management</h1>
          <p className="text-zinc-600">Review all users, manage tool access, and promote admins.</p>
        </div>
        <a href="/admin/approvals" className="rounded-full border border-zinc-300 bg-zinc-50 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
          Back to Approvals
        </a>
      </div>

      <div className="grid gap-6">
        {users.users.map((u) => {
          const userTools = userToolsMap.get(u.id) || []
          return (
            <div key={u.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold">{u.email || 'No email'}</p>
                  <p className="text-sm text-zinc-600">Status: {u.user_metadata?.status || 'unknown'}</p>
                  <p className="text-sm text-zinc-600">Role: {u.user_metadata?.role || 'user'}</p>
                  <p className="text-sm text-zinc-600">Tools: {userTools.length > 0 ? userTools.join(', ') : 'None'}</p>
                </div>
                <div className="flex flex-col gap-3 sm:min-w-[200px]">
                  {u.user_metadata?.role !== 'admin' ? (
                    <form action={promoteToAdmin} className="flex">
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        Promote to Admin
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-full bg-green-600 px-4 py-2 text-sm text-white">Admin</span>
                  )}

                  <form action={updateToolAccess} className="space-y-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <p className="text-sm font-medium">Tool Access:</p>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="tools"
                          value="coverage-tracker"
                          defaultChecked={userTools.includes('coverage-tracker')}
                          className="rounded"
                        />
                        Coverage Tracker
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="tools"
                          value="expenses-manager"
                          defaultChecked={userTools.includes('expenses-manager')}
                          className="rounded"
                        />
                        Expenses Manager
                      </label>
                    </div>
                    <button type="submit" className="rounded-full bg-zinc-600 px-4 py-2 text-sm text-white hover:bg-zinc-700">
                      Update Access
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
