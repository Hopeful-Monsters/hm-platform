import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

// ── Server Actions ────────────────────────────────────────────────

async function promoteToAdmin(formData: FormData) {
  'use server'
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

async function updateToolAccess(formData: FormData) {
  'use server'
  const userId       = formData.get('userId') as string
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

// ── Style helpers ─────────────────────────────────────────────────

const metaStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color:         'var(--text-dim)',
}

const checkboxLabelStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        8,
  fontSize:   13,
  color:      'var(--text-muted)',
  cursor:     'pointer',
}

// ── Page ──────────────────────────────────────────────────────────

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users }          = await service.auth.admin.listUsers()
  const { data: toolAccessData } = await service.from('tool_access').select('*')

  // Map user_id → tool slugs
  const userToolsMap = new Map<string, string[]>()
  toolAccessData?.forEach(row => {
    if (!userToolsMap.has(row.user_id)) userToolsMap.set(row.user_id, [])
    userToolsMap.get(row.user_id)!.push(row.tool_slug)
  })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Admin / Users</p>
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

      {/* Table header */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 160px 180px',
          gap:                 0,
          padding:             '8px 16px',
          borderBottom:        '2px solid var(--border)',
          marginBottom:        2,
        }}
      >
        {['User', 'Role / Status', 'Tool Access'].map(col => (
          <span key={col} style={metaStyle}>{col}</span>
        ))}
      </div>

      {/* User rows */}
      {users.users.map(u => {
        const userTools = userToolsMap.get(u.id) ?? []
        const isAdmin   = u.user_metadata?.role === 'admin'

        return (
          <div
            key={u.id}
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 160px 180px',
              gap:                 0,
              alignItems:          'start',
              padding:             '16px',
              borderBottom:        '1px solid var(--border)',
              background:          'var(--surface)',
              marginBottom:        1,
            }}
          >
            {/* User info */}
            <div>
              <p
                style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    700,
                  fontSize:      17,
                  textTransform: 'uppercase',
                  color:         'var(--text)',
                  marginBottom:  3,
                }}
              >
                {u.email ?? 'No email'}
              </p>
              <p style={metaStyle}>
                Status: {u.user_metadata?.status ?? 'unknown'}
              </p>
            </div>

            {/* Role */}
            <div style={{ paddingTop: 2 }}>
              {isAdmin ? (
                <span
                  style={{
                    fontFamily:    'var(--font-heading)',
                    fontWeight:    700,
                    fontSize:      12,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    background:    '#001820',
                    color:         '#00B4D8',
                    padding:       '4px 10px',
                    display:       'inline-block',
                  }}
                >
                  Admin
                </span>
              ) : (
                <form action={promoteToAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    style={{
                      fontFamily:    'var(--font-heading)',
                      fontWeight:    900,
                      fontSize:      12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      background:    'transparent',
                      color:         'var(--text-dim)',
                      border:        '2px solid var(--border-2)',
                      padding:       '4px 10px',
                      cursor:        'pointer',
                    }}
                  >
                    Make Admin
                  </button>
                </form>
              )}
            </div>

            {/* Tool access */}
            <form action={updateToolAccess} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="hidden" name="userId" value={u.id} />
              {[
                { value: 'coverage-tracker', label: 'Coverage Tracker' },
                { value: 'expenses-manager', label: 'Expenses Manager' },
              ].map(tool => (
                <label key={tool.value} style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    name="tools"
                    value={tool.value}
                    defaultChecked={userTools.includes(tool.value)}
                    style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
                  />
                  {tool.label}
                </label>
              ))}
              <button
                type="submit"
                style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    900,
                  fontSize:      11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background:    'var(--surface-2)',
                  color:         'var(--text-muted)',
                  border:        '2px solid var(--border)',
                  padding:       '5px 12px',
                  cursor:        'pointer',
                  marginTop:     4,
                }}
              >
                Update
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
