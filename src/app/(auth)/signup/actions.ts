'use server'

import { Resend } from 'resend'
import { z } from 'zod'
import { headers } from 'next/headers'
import { createHash } from 'node:crypto'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'

const emailSchema = z.string().email()

async function hashKey(input: string): Promise<string> {
  return createHash('sha256').update(input).digest('hex').slice(0, 24)
}

export async function notifyAdmin(email: string): Promise<void> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // Combine email + IP so a single forged x-forwarded-for header can't
  // mass-trigger admin notifications across many distinct emails.
  const keyHash = await hashKey(`${parsed.data}|${ip}`)
  const limited = await applyRateLimit(rateLimits.auth, `auth:notify-admin:${keyHash}`)
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
