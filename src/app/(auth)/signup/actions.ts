'use server'

import { Resend } from 'resend'
import { z } from 'zod'
import { headers } from 'next/headers'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'

const emailSchema = z.string().email()

export async function notifyAdmin(email: string): Promise<void> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await applyRateLimit(rateLimits.auth, `auth:notify-admin:${ip}`)
  if (limited) return  // rate-limited — skip silently, non-critical

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from:    'noreply@hopefulmonsters.com.au',
      to:      process.env.ADMIN_EMAIL || 'hello@hopefulmonsters.com.au',
      subject: 'New User Signup',
      text:    `New user signed up: ${email}. Please approve at /admin/approvals`,
    })
  } catch {
    // Non-critical — don't surface email failures to the user
  }
}
