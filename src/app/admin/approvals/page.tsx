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
  // Send email
  const { data: userData } = await service.auth.admin.getUserById(userId)
  if (userData.user?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'admin@hm-platform.com',
      to: userData.user.email,
      subject: 'Account Approved',
      text: 'Your account has been approved. You can now access the tools at hm-platform.com'
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
  const pendingUsers = users.users.filter(u => u.user_metadata?.status === 'pending')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pending Approvals</h1>
      <ul className="space-y-4">
        {pendingUsers.map(u => (
          <li key={u.id} className="flex justify-between items-center p-4 bg-gray-100 rounded">
            <span>{u.email}</span>
            <form action={approveUser}>
              <input type="hidden" name="userId" value={u.id} />
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Approve
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}