import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Validate query params from Google's OAuth redirect.
// Bounds string lengths to prevent oversized inputs and enforces expected shapes.
const CallbackQuerySchema = z.object({
  // Authorization code — Google uses ~70 char codes; 512 gives headroom
  code:  z.string().min(1).max(512).optional(),
  // CSRF state — we generate UUID v4 values
  state: z.string().uuid().optional(),
  // Error string from Google (e.g. "access_denied") — cap at 128 chars
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

/** Renders a minimal HTML page that postMessages to the opener and closes itself. */
function popupResponse(msg: Record<string, unknown>, origin: string) {
  const payloadJson = escapeHtml(JSON.stringify(msg))
  const safeOrigin = JSON.stringify(normalizeTargetOrigin(origin))
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <script id="payload" type="application/json">${payloadJson}</script>
      <script>
        try {
          const raw = document.getElementById('payload')?.textContent || '{}';
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

  // Validate and bound all query params before using them
  const queryParsed = CallbackQuerySchema.safeParse({
    code:  searchParams.get('code')  ?? undefined,
    state: searchParams.get('state') ?? undefined,
    error: searchParams.get('error') ?? undefined,
  })
  if (!queryParsed.success) {
    return popupResponse({ driveError: 'Invalid callback parameters' }, safeOrigin)
  }
  const { code, state, error } = queryParsed.data

  // Google returned an error (e.g. access_denied, popup_closed_by_user)
  if (error) return popupResponse({ driveError: error }, safeOrigin)
  if (!code)  return popupResponse({ driveError: 'No authorization code returned' }, safeOrigin)

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState  = cookieStore.get('drive_oauth_state')?.value
  cookieStore.delete('drive_oauth_state')

  if (!savedState || savedState !== state) {
    return popupResponse({ driveError: 'Invalid state parameter — please try again' }, safeOrigin)
  }

  // Require authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return popupResponse({ driveError: 'Not authenticated' }, safeOrigin)

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return popupResponse({ driveError: 'Google OAuth not configured on the server' }, safeOrigin)
  }

  // Exchange authorization code for tokens
  const redirectUri = `${safeOrigin}/api/expenses-manager/drive/callback`
  const tokenRes    = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
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
    refresh_token?: string
    access_token?:  string
    error?:         string
    error_description?: string
  }

  if (!tokenRes.ok || tokens.error) {
    return popupResponse(
      { driveError: tokens.error_description || tokens.error || `Token exchange failed (${tokenRes.status})` },
      safeOrigin,
    )
  }

  if (!tokens.refresh_token) {
    // Happens if the user had already granted access and we didn't get a fresh refresh_token.
    // The auth route uses prompt=consent to prevent this, but handle it defensively.
    return popupResponse(
      { driveError: 'No refresh token returned. Revoke app access in Google Account settings and try again.' },
      safeOrigin,
    )
  }

  // Persist refresh token in Supabase user_metadata (server-side only — never sent to client)
  const { error: updateErr } = await supabase.auth.updateUser({
    data: { drive_refresh_token: tokens.refresh_token },
  })

  if (updateErr) {
    return popupResponse({ driveError: `Failed to save credentials: ${updateErr.message}` }, safeOrigin)
  }

  return popupResponse({ driveConnected: true }, safeOrigin)
}
