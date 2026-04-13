import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { TOOL_LABEL, TOOL_SLUGS, type ToolSlug } from '@/lib/tools'

// ── Server Actions ────────────────────────────────────────────────

async function approveUser(formData: FormData) {
  'use server'
  const userId       = formData.get('userId') as string
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

  // Grant access — bail early if this fails so we don't mark the request
  // approved or notify the user for an action that didn't complete.
  const { error: accessError } = await service
    .from('tool_access')
    .insert({ user_id: userId, tool_slug: toolSlug, plan: 'basic' })

  if (accessError) {
    console.error('approveToolRequest: failed to grant tool access:', accessError.message)
    return
  }

  // Mark request approved — log but continue to notification if this fails;
  // the access grant already succeeded so the user state is correct.
  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  if (updateError) {
    console.error('approveToolRequest: failed to update request status:', updateError.message)
  }

  // Notify user (non-fatal)
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

  // Mark request denied — bail early if this fails so we don't notify
  // the user for an action that didn't complete.
  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'denied' })
    .eq('id', requestId)

  if (updateError) {
    console.error('denyToolRequest: failed to update request status:', updateError.message)
    return
  }

  // Notify user (non-fatal)
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

// ── Shared style helpers ──────────────────────────────────────────

const rowStyle: React.CSSProperties = {
  background:   'var(--surface)',
  border:       '2px solid var(--border)',
  borderLeft:   '4px solid var(--accent)',
  padding:      '24px',
  marginBottom: 8,
}

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    900,
  fontSize:      26,
  textTransform: 'uppercase',
  color:         'var(--text)',
  lineHeight:    0.95,
  marginBottom:  20,
}

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
  fontSize:   14,
  color:      'var(--text-muted)',
  cursor:     'pointer',
  fontFamily: 'var(--font-sans)',
}

// ── Page ──────────────────────────────────────────────────────────

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/auth/login')

  const service = createServiceClient()
  const { data: users } = await service.auth.admin.listUsers()
  const pendingUsers  = users.users.filter(u => u.user_metadata?.status === 'pending')
  const nonAdminUsers = users.users.filter(u => u.user_metadata?.role !== 'admin')

  const { data: toolRequests } = await service
    .from('tool_access_requests')
    .select('id, user_id, user_email, tool_slug, message, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Admin / Approvals</p>
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

      {/* Pending approvals */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeadingStyle}>
          Waiting for approval{' '}
          <span style={{ color: 'var(--accent)' }}>({pendingUsers.length})</span>
        </h2>

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
                    { value: 'coverage-tracker',  label: 'Coverage Tracker' },
                    { value: 'expenses-manager',   label: 'Expenses Manager' },
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
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeadingStyle}>
          Tool access requests{' '}
          <span style={{ color: 'var(--accent)' }}>({toolRequests?.length ?? 0})</span>
        </h2>

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
              <div
                key={req.id}
                style={{
                  ...rowStyle,
                  borderLeftColor: 'var(--accent)',
                }}
              >
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

      {/* Role management */}
      <section>
        <h2 style={{ ...sectionHeadingStyle, borderLeft: '4px solid var(--pink)', paddingLeft: 12 }}>
          User Roles
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Promote trusted users to admin so they can manage approvals and access.
        </p>

        {nonAdminUsers.map(u => (
          <div
            key={u.id}
            style={{
              ...rowStyle,
              borderLeftColor: 'var(--border-2)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'space-between',
              gap:             16,
              flexWrap:        'wrap',
            }}
          >
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 2 }}>
                {u.email}
              </p>
              <p style={metaStyle}>
                Status: {u.user_metadata?.status ?? 'unknown'} &nbsp;·&nbsp; Role: {u.user_metadata?.role ?? 'user'}
              </p>
            </div>

            <form action={promoteToAdmin}>
              <input type="hidden" name="userId" value={u.id} />
              <button
                type="submit"
                style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    900,
                  fontSize:      14,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background:    'transparent',
                  color:         'var(--pink)',
                  border:        '2px solid var(--pink)',
                  padding:       '8px 18px',
                  cursor:        'pointer',
                }}
              >
                Make Admin
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  )
}
