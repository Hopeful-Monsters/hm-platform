import { z } from 'zod'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimits } from '@/lib/upstash/ratelimit'
import { TOOL_SLUGS, TOOL_LABEL, type ToolSlug } from '@/lib/tools'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

const schema = z.object({
  tool_slug: z.string().refine(s => TOOL_SLUGS.includes(s), { message: 'Unknown tool' }),
  message:   z.string().max(500).optional(),
})

export const POST = createApiRoute({
  auth:   'user',
  schema,
  // Dedicated limiter: tighter than the general /api 30/min cap because
  // access requests should be intentional one-offs.
  rateLimit: {
    limiter: rateLimits.requests,
    key:     user => `tool-access-request:${user.id}`,
  },
  handler: async ({ user, body }) => {
    if (user!.user_metadata?.status !== 'approved') {
      throw new HttpError(403, 'Account not yet approved')
    }

    const { tool_slug, message } = body
    const service = createServiceClient()

    const { data: existingAccess } = await service
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user!.id)
      .eq('tool_slug', tool_slug)
      .maybeSingle()
    if (existingAccess) throw new HttpError(409, 'You already have access to this tool')

    const { data: existingRequest } = await service
      .from('tool_access_requests')
      .select('id')
      .eq('user_id', user!.id)
      .eq('tool_slug', tool_slug)
      .eq('status', 'pending')
      .maybeSingle()
    if (existingRequest) {
      throw new HttpError(409, 'You already have a pending request for this tool')
    }

    const { error: insertError } = await service
      .from('tool_access_requests')
      .insert({
        user_id:    user!.id,
        user_email: user!.email,
        tool_slug,
        message:    message ?? null,
        status:     'pending',
      })
    if (insertError) {
      console.error('Failed to insert tool access request:', insertError.message)
      throw new HttpError(500, 'Failed to submit request. Please try again.')
    }

    // Admin notification — non-fatal.
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      console.error('ADMIN_EMAIL is not set — skipping admin notification for tool access request')
    } else if (process.env.RESEND_API_KEY) {
      try {
        const resend    = new Resend(process.env.RESEND_API_KEY)
        const toolLabel = TOOL_LABEL[tool_slug as ToolSlug] ?? tool_slug
        await resend.emails.send({
          from:    'noreply@hopefulmonsters.com.au',
          to:      adminEmail,
          subject: `Tool Access Request — ${toolLabel}`,
          text: [
            `${user!.email} has requested access to ${toolLabel}.`,
            message ? `\nNote from user: ${message}` : '',
            `\nReview at: app.hopefulmonsters.com.au/admin/approvals`,
          ].join(''),
        })
      } catch (err) {
        console.warn('Admin notification email failed (non-fatal):', err)
      }
    }

    return Response.json({ ok: true })
  },
})
