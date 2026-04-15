import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { UsersClient, type UserRow } from './UsersClient'

// ── Server Actions ────────────────────────────────────────────────

async function promoteToAdmin(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return

  const userId  = formData.get('userId') as string
  const service = createServiceClient()

  const { data: userData } = await service.auth.admin.getUserById(userId)
  const existing = userData.user?.user_metadata ?? {}

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, role: 'admin' },
  })

  if (userData.user?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from:    'noreply@hopefulmonsters.com.au',
      to:      userData.user.email,
      subject: 'Admin Access Granted — Hopeful Monsters',
      text:    'You have been granted administrator access on hopefulmonsters.com.au.',
    })
  }

  revalidatePath('/admin/users')
}

async function revokeAdmin(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return

  const userId  = formData.get('userId') as string
  const service = createServiceClient()

  const { data: userData } = await service.auth.admin.getUserById(userId)
  const existing = userData.user?.user_metadata ?? {}

  // Master admin cannot be revoked — only transferred via Supabase directly
  if (existing.is_master_admin) return

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, role: 'user' },
  })

  revalidatePath('/admin/users')
}

async function updateToolAccess(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return

  const userId        = formData.get('userId') as string
  const selectedTools = formData.getAll('tools') as string[]

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
  const { data: users }          = await service.auth.admin.listUsers()
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
    role:          u.user_metadata?.role        ?? null,
    isMasterAdmin: !!u.user_metadata?.is_master_admin,
    tools:         userToolsMap.get(u.id) ?? [],
  }))

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontFamily:    'var(--font-heading)',
            fontWeight:    900,
            fontSize:      48,
            textTransform: 'uppercase',
            color:         'var(--text)',
            lineHeight:    0.92,
            letterSpacing: '-0.01em',
          }}
        >
          User Management
        </h1>
      </div>

      <UsersClient
        users={rows}
        promoteToAdmin={promoteToAdmin}
        revokeAdmin={revokeAdmin}
        updateToolAccess={updateToolAccess}
      />
    </div>
  )
}
