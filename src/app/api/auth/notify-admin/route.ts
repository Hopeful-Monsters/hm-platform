import { Resend } from 'resend'
import { z } from 'zod'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  // Rate limit by IP — reuses auth limiter (5 attempts per 15 min)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await applyRateLimit(rateLimits.auth, `auth:notify-admin:${ip}`)
  if (limited) return limited

  // Validate input
  const body = await request.json().catch(() => null)
  const result = schema.safeParse(body)
  if (!result.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email } = result.data
  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'noreply@hopefulmonsters.com.au',
    to: process.env.ADMIN_EMAIL || 'admin@hm-platform.com',
    subject: 'New User Signup',
    text: `New user signed up: ${email}. Please approve at /admin/approvals`,
  })
  return Response.json({ ok: true })
}