import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { UsersClient, type UserRow } from './UsersClient'
import { TOOL_SLUGS } from '@/lib/tools'

// Valid roles. Keep in sync with proxy.ts + auth.ts.
const VALID_ROLES = ['admin', 'editor', 'user'] as const
type UserRole = typeof VALID_ROLES[number]

// ── Server Actions ────────────────────────────────────────────────

/**
 * Sets a user's role to one of: 'admin' | 'editor' | 'user'.
 * Master admin cannot be demoted — that gate lives in Supabase directly.
 * Sends an email when promoting to admin.
 */
async function setRole(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return

  const userId  = formData.get('userId') as string
  const newRole = formData.get('role') as string
  if (!VALID_ROLES.includes(newRole as UserRole)) return

  const service = createServiceClient()
  const { data: userData } = await service.auth.admin.getUserById(userId)
  const existing = userData.user?.user_metadata ?? {}

  // Master admin cannot be demoted via the UI
  if (existing.is_master_admin) return

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, role: newRole },
  })

  // Email notification only when granting admin
  if (newRole === 'admin' && userData.user?.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from:    'noreply@hopefulmonsters.com.au',
        to:      userData.user.email,
        subject: 'Admin Access Granted — Hopeful Monsters',
        text:    'You have been granted administrator access on app.hopefulmonsters.com.au.',
      })
    } catch (err) {
      console.warn('[admin/users] role email failed (non-fatal):', err)
    }
  }

  revalidatePath('/admin/users')
}

async function updateToolAccess(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return

  const userId        = formData.get('userId') as string
  const selectedTools = (formData.getAll('tools') as string[]).filter(s => TOOL_SLUGS.includes(s))

  const service = createServiceClient()
  await service.from('tool_access').delete().eq('user_id', userId)

  if (selectedTools.length > 0) {
    await service.from('tool_access').insert(
      selectedTools.map(toolSlug => ({ user_id: userId, tool_slug: toolSlug, plan: 'basic' }))
    )
  }

  revalidatePath('/admin/users')
}

// ── Page ──────────────────────────────────────────────────────────

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/login')

  const service = createServiceClient()
  const { data: users }          = await service.auth.admin.listUsers({ perPage: 200 })
  const { data: toolAccessData } = await service.from('tool_access').select('*')

  // Map user_id → tool slugs
  const userToolsMap = new Map<string, string[]>()
  toolAccessData?.forEach(row => {
    if (!userToolsMap.has(row.user_id)) userToolsMap.set(row.user_id, [])
    userToolsMap.get(row.user_id)!.push(row.tool_slug)
  })

  const rows: UserRow[] = users.users.map(u => ({
    id:            u.id,
    email:         u.email ?? null,
    firstName:     u.user_metadata?.first_name ?? null,
    lastName:      u.user_metadata?.last_name  ?? null,
    status:        u.user_metadata?.status     ?? null,
    role:          u.user_metadata?.role        ?? 'user',
    isMasterAdmin: !!u.user_metadata?.is_master_admin,
    tools:         userToolsMap.get(u.id) ?? [],
  }))

  return (
    <div>
      <div className="mb-9">
        <h1 className="users-page-heading">User Management</h1>
      </div>

      <UsersClient
        users={rows}
        setRole={setRole}
        updateToolAccess={updateToolAccess}
      />
    </div>
  )
}
