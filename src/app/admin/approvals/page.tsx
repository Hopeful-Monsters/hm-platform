import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { TOOL_LABEL, TOOL_SLUGS, type ToolSlug } from '@/lib/tools'

// ── Server Actions ────────────────────────────────────────────────

async function approveUser(formData: FormData) {
  'use server'
  const userId        = formData.get('userId') as string
  const selectedTools = formData.getAll('tools') as string[]

  const service = createServiceClient()

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { status: 'approved' },
  })

  if (selectedTools.length > 0) {
    await service.from('tool_access').insert(
      selectedTools.map(toolSlug => ({ user_id: userId, tool_slug: toolSlug, plan: 'basic' }))
    )
  }

  const { data: userData } = await service.auth.admin.getUserById(userId)
  if (userData.user?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from:    'noreply@hopefulmonsters.com.au',
      to:      userData.user.email,
      subject: 'Account Approved — Hopeful Monsters',
      text:    `Your account has been approved. You now have access to: ${selectedTools.join(', ')}. Sign in at app.hopefulmonsters.com.au`,
    })
  }

  revalidatePath('/admin/approvals')
}

async function approveToolRequest(formData: FormData) {
  'use server'
  const requestId = formData.get('requestId') as string
  const userId    = formData.get('userId') as string
  const userEmail = formData.get('userEmail') as string
  const toolSlug  = formData.get('toolSlug') as string

  if (!TOOL_SLUGS.includes(toolSlug)) return

  const service = createServiceClient()

  const { error: accessError } = await service
    .from('tool_access')
    .insert({ user_id: userId, tool_slug: toolSlug, plan: 'basic' })

  if (accessError) {
    console.error('approveToolRequest: failed to grant tool access:', accessError.message)
    return
  }

  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  if (updateError) {
    console.error('approveToolRequest: failed to update request status:', updateError.message)
  }

  if (userEmail) {
    try {
      const toolLabel = TOOL_LABEL[toolSlug as ToolSlug] ?? toolSlug
      const resend    = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from:    'noreply@hopefulmonsters.com.au',
        to:      userEmail,
        subject: `Access Granted — ${toolLabel}`,
        text:    `Your request for access to ${toolLabel} has been approved.\n\nSign in at app.hopefulmonsters.com.au to get started.`,
      })
    } catch (err) {
      console.error('approveToolRequest: notification email failed (non-fatal):', err)
    }
  }

  revalidatePath('/admin/approvals')
}

async function denyToolRequest(formData: FormData) {
  'use server'
  const requestId = formData.get('requestId') as string
  const userEmail = formData.get('userEmail') as string
  const toolSlug  = formData.get('toolSlug') as string

  if (!TOOL_SLUGS.includes(toolSlug)) return

  const service   = createServiceClient()
  const toolLabel = TOOL_LABEL[toolSlug as ToolSlug] ?? toolSlug

  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'denied' })
    .eq('id', requestId)

  if (updateError) {
    console.error('denyToolRequest: failed to update request status:', updateError.message)
    return
  }

  if (userEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from:    'noreply@hopefulmonsters.com.au',
        to:      userEmail,
        subject: `Access Request Update — ${toolLabel}`,
        text:    `Your request for access to ${toolLabel} has not been approved at this time.\n\nIf you think this is a mistake, reply to this email.`,
      })
    } catch (err) {
      console.error('denyToolRequest: notification email failed (non-fatal):', err)
    }
  }

  revalidatePath('/admin/approvals')
}

// ── Style helpers ─────────────────────────────────────────────────

const rowStyle: React.CSSProperties = {
  background:   'var(--surface)',
  border:       '2px solid var(--border)',
  borderLeft:   '4px solid var(--accent)',
  padding:      '24px',
  marginBottom: 8,
}

const metaStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color:         'var(--text-dim)',
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color:         'var(--text-dim)',
  marginBottom:  16,
  display:       'block',
}

const checkboxLabelStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        8,
  fontSize:   14,
  color:      'var(--text-muted)',
  cursor:     'pointer',
  fontFamily: 'var(--font-body)',
}

// ── Page ──────────────────────────────────────────────────────────

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users } = await service.auth.admin.listUsers()
  const pendingUsers = users.users.filter(u => u.user_metadata?.status === 'pending')

  const { data: toolRequests } = await service
    .from('tool_access_requests')
    .select('id, user_id, user_email, tool_slug, message, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

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
          Pending Approvals
        </h1>
      </div>

      {/* Pending user approvals */}
      <section style={{ marginBottom: 48 }}>
        <span style={sectionLabelStyle}>
          Waiting for approval ({pendingUsers.length})
        </span>

        {pendingUsers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            No pending users right now.
          </p>
        ) : (
          pendingUsers.map(u => (
            <div key={u.id} style={rowStyle}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 4 }}>
                  {u.email}
                </p>
                <p style={metaStyle}>Status: {u.user_metadata?.status ?? 'unknown'}</p>
              </div>

              <form action={approveUser}>
                <input type="hidden" name="userId" value={u.id} />

                <p style={{ ...metaStyle, marginBottom: 10 }}>Grant access to:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    { value: 'coverage-tracker', label: 'Coverage Tracker' },
                    { value: 'expenses-manager', label: 'Expenses Manager' },
                  ].map(tool => (
                    <label key={tool.value} style={checkboxLabelStyle}>
                      <input
                        type="checkbox"
                        name="tools"
                        value={tool.value}
                        defaultChecked
                        style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                      />
                      {tool.label}
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  style={{
                    fontFamily:    'var(--font-heading)',
                    fontWeight:    900,
                    fontSize:      16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    background:    'var(--accent)',
                    color:         'var(--accent-fg)',
                    border:        'none',
                    padding:       '10px 24px',
                    cursor:        'pointer',
                  }}
                >
                  Approve User →
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      {/* Tool access requests */}
      <section>
        <span style={sectionLabelStyle}>
          Tool access requests ({toolRequests?.length ?? 0})
        </span>

        {!toolRequests || toolRequests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            No pending tool access requests.
          </p>
        ) : (
          toolRequests.map(req => {
            const toolLabel = TOOL_LABEL[req.tool_slug as ToolSlug] ?? req.tool_slug
            const createdAt = new Date(req.created_at).toLocaleDateString('en-AU', {
              day:   '2-digit',
              month: 'short',
              year:  'numeric',
            })
            return (
              <div key={req.id} style={rowStyle}>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 4 }}>
                    {req.user_email}
                  </p>
                  <p style={metaStyle}>
                    Requesting: {toolLabel} &nbsp;·&nbsp; {createdAt}
                  </p>
                  {req.message && (
                    <p
                      style={{
                        marginTop:  10,
                        fontSize:   14,
                        color:      'var(--text-muted)',
                        fontFamily: 'var(--font-body)',
                        lineHeight: 1.55,
                        background: 'var(--surface-2)',
                        border:     '1px solid var(--border)',
                        padding:    '8px 12px',
                      }}
                    >
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <form action={approveToolRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="userId"    value={req.user_id} />
                    <input type="hidden" name="userEmail" value={req.user_email ?? ''} />
                    <input type="hidden" name="toolSlug"  value={req.tool_slug} />
                    <button
                      type="submit"
                      style={{
                        fontFamily:    'var(--font-heading)',
                        fontWeight:    900,
                        fontSize:      14,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        background:    'var(--accent)',
                        color:         'var(--accent-fg)',
                        border:        'none',
                        padding:       '9px 20px',
                        cursor:        'pointer',
                      }}
                    >
                      Approve →
                    </button>
                  </form>

                  <form action={denyToolRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="userEmail" value={req.user_email ?? ''} />
                    <input type="hidden" name="toolSlug"  value={req.tool_slug} />
                    <button
                      type="submit"
                      style={{
                        fontFamily:    'var(--font-heading)',
                        fontWeight:    900,
                        fontSize:      14,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        background:    'transparent',
                        color:         'var(--text-muted)',
                        border:        '2px solid var(--border)',
                        padding:       '9px 20px',
                        cursor:        'pointer',
                      }}
                    >
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
