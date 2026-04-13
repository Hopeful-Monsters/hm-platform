import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { TOOL_SLUGS, TOOL_LABEL, type ToolSlug } from '@/lib/tools'

const schema = z.object({
  tool_slug: z.string().refine(s => TOOL_SLUGS.includes(s), { message: 'Unknown tool' }),
  message:   z.string().max(500).optional(),
})

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Only approved users can request additional tool access
  if (user.user_metadata?.status !== 'approved') {
    return Response.json({ error: 'Account not yet approved' }, { status: 403 })
  }

  // ── Rate limit ────────────────────────────────────────────────────
  // Dedicated limiter: 5 requests per hour per user. The general api limiter
  // (30/min) is intentionally not used here — access requests are intentional
  // one-off actions and warrant a tighter, time-extended window.
  const limited = await applyRateLimit(rateLimits.requests, `tool-access-request:${user.id}`)
  if (limited) return limited

  // ── Parse body ────────────────────────────────────────────────────
  const body = await request.json().catch(() => null)
  const result = schema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: 'Invalid request', issues: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { tool_slug, message } = result.data
  const service = createServiceClient()

  // ── Guard: user already has access ───────────────────────────────
  const { data: existingAccess } = await service
    .from('tool_access')
    .select('tool_slug')
    .eq('user_id', user.id)
    .eq('tool_slug', tool_slug)
    .maybeSingle()

  if (existingAccess) {
    return Response.json({ error: 'You already have access to this tool' }, { status: 409 })
  }

  // ── Guard: pending request already exists ─────────────────────────
  const { data: existingRequest } = await service
    .from('tool_access_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('tool_slug', tool_slug)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingRequest) {
    return Response.json(
      { error: 'You already have a pending request for this tool' },
      { status: 409 }
    )
  }

  // ── Insert request ────────────────────────────────────────────────
  const { error: insertError } = await service
    .from('tool_access_requests')
    .insert({
      user_id:    user.id,
      user_email: user.email,
      tool_slug,
      message:    message ?? null,
      status:     'pending',
    })

  if (insertError) {
    console.error('Failed to insert tool access request:', insertError.message)
    return Response.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
  }

  // ── Notify admin (non-fatal) ──────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.error('ADMIN_EMAIL is not set — skipping admin notification for tool access request')
  } else {
    try {
      const resend    = new Resend(process.env.RESEND_API_KEY!)
      const toolLabel = TOOL_LABEL[tool_slug as ToolSlug] ?? tool_slug
      await resend.emails.send({
        from:    'noreply@hopefulmonsters.com.au',
        to:      adminEmail,
        subject: `Tool Access Request — ${toolLabel}`,
        text: [
          `${user.email} has requested access to ${toolLabel}.`,
          message ? `\nNote from user: ${message}` : '',
          `\nReview at: app.hopefulmonsters.com.au/admin/approvals`,
        ].join(''),
      })
    } catch (err) {
      console.warn('Admin notification email failed (non-fatal):', err)
    }
  }

  return Response.json({ ok: true })
}
