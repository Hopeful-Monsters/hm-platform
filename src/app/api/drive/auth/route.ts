/**
 * Platform-level Google Drive OAuth initiation.
 *
 * Opens the Google consent screen. On completion, Google redirects to
 * /api/drive/callback which stores the refresh token in drive_tokens.
 *
 * IMPORTANT — GCP setup:
 *   Add https://[your-domain]/api/drive/callback to your OAuth 2.0 Client's
 *   Authorized redirect URIs in Google Cloud Console → APIs & Services → Credentials.
 *
 * Used by: expenses-manager, coverage-tracker (any tool that needs Drive access).
 */

import { getCurrentUser } from '@/lib/auth'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { cookies } from 'next/headers'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export async function GET(request: Request) {
  // Any authenticated, approved user can initiate Drive auth.
  // Tool-specific access is checked when the token is actually used.
  const user = await getCurrentUser()
  if (!user) return new Response('Forbidden', { status: 403 })
  if (user.user_metadata?.status !== 'approved') return new Response('Forbidden', { status: 403 })

  // Rate limit — prevents spamming OAuth initiations
  const limited = await applyRateLimit(rateLimits.api, `drive:auth:${user.id}`)
  if (limited) return limited

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 })

  // CSRF state — stored in an httpOnly cookie, verified in the callback
  const state       = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('drive_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutes
    path:     '/',
  })

  const origin      = new URL(request.url).origin
  const redirectUri = `${origin}/api/drive/callback`

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         DRIVE_SCOPE,
    access_type:   'offline',
    prompt:        'consent', // Always request refresh_token
    state,
  })

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
