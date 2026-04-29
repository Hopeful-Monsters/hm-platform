/**
 * Platform-level Google Drive OAuth callback.
 *
 * Google redirects here after the user grants (or denies) access.
 * Validates CSRF state, exchanges the code for tokens, and stores the
 * refresh token in drive_tokens via the service role client.
 *
 * Responds with a minimal HTML page that postMessages the result to the
 * opener popup and closes itself — same pattern as the expenses-manager callback.
 *
 * IMPORTANT — GCP setup:
 *   This URL must be listed in your OAuth 2.0 Client's Authorized redirect URIs:
 *   https://[your-domain]/api/drive/callback
 */

import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { setDriveRefreshToken } from '@/lib/google/drive-tokens'
import { getAppOrigin } from '@/lib/app-origin'
import { cookies } from 'next/headers'

const CallbackQuerySchema = z.object({
  code:  z.string().min(1).max(512).optional(),
  state: z.string().uuid().optional(),
  error: z.string().max(128).optional(),
})

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeTargetOrigin(origin: string) {
  return /^https?:\/\/[^/\s]+$/i.test(origin) ? origin : 'null'
}

function popupResponse(msg: Record<string, unknown>, origin: string) {
  const payloadJson = escapeHtml(JSON.stringify(msg))
  const safeOrigin  = JSON.stringify(normalizeTargetOrigin(origin))
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <script id="payload" type="application/json">${payloadJson}</script>
      <script>
        try {
          const raw  = document.getElementById('payload')?.textContent || '{}';
          const data = JSON.parse(raw);
          window.opener?.postMessage(data, ${safeOrigin});
        } catch(e) {}
        window.close();
      </script>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const safeOrigin = normalizeTargetOrigin(origin)

  const queryParsed = CallbackQuerySchema.safeParse({
    code:  searchParams.get('code')  ?? undefined,
    state: searchParams.get('state') ?? undefined,
    error: searchParams.get('error') ?? undefined,
  })
  if (!queryParsed.success) {
    return popupResponse({ driveError: 'Invalid callback parameters' }, safeOrigin)
  }
  const { code, state, error } = queryParsed.data

  if (error) return popupResponse({ driveError: error }, safeOrigin)
  if (!code)  return popupResponse({ driveError: 'No authorization code returned' }, safeOrigin)

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState  = cookieStore.get('drive_oauth_state')?.value
  cookieStore.delete('drive_oauth_state')

  if (!savedState || savedState !== state) {
    return popupResponse({ driveError: 'Invalid state parameter — please try again' }, safeOrigin)
  }

  // Require authenticated, approved session
  const user = await getCurrentUser()
  if (!user) return popupResponse({ driveError: 'Not authenticated' }, safeOrigin)
  if (user.user_metadata?.status !== 'approved') {
    return popupResponse({ driveError: 'Account not approved' }, safeOrigin)
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return popupResponse({ driveError: 'Google OAuth not configured on the server' }, safeOrigin)
  }

  // Exchange authorization code for tokens — must match the redirect_uri used
  // in /api/drive/auth and the value registered in Google Cloud Console.
  const redirectUri = `${getAppOrigin(request)}/api/drive/callback`
  const tokenRes    = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json() as {
    refresh_token?:      string
    access_token?:       string
    error?:              string
    error_description?:  string
  }

  if (!tokenRes.ok || tokens.error) {
    return popupResponse(
      { driveError: tokens.error_description ?? tokens.error ?? `Token exchange failed (${tokenRes.status})` },
      safeOrigin,
    )
  }

  if (!tokens.refresh_token) {
    return popupResponse(
      { driveError: 'No refresh token returned. Revoke app access in Google Account settings and try again.' },
      safeOrigin,
    )
  }

  // Encrypt + store refresh token (service role only — never exposed to client JS).
  const { error: upsertErr } = await setDriveRefreshToken(user.id, tokens.refresh_token)
  if (upsertErr) {
    return popupResponse({ driveError: `Failed to save credentials: ${upsertErr}` }, safeOrigin)
  }

  return popupResponse({ driveConnected: true }, safeOrigin)
}
