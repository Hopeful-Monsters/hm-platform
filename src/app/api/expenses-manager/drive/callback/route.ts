import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/** Renders a minimal HTML page that postMessages to the opener and closes itself. */
function popupResponse(msg: Record<string, unknown>, origin: string) {
  const payload = JSON.stringify(msg)
  const safeOrigin = JSON.stringify(origin)
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
      try { window.opener.postMessage(${payload}, ${safeOrigin}); } catch(e) {}
      window.close();
    </script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Google returned an error (e.g. access_denied, popup_closed_by_user)
  if (error) return popupResponse({ driveError: error }, origin)
  if (!code)  return popupResponse({ driveError: 'No authorization code returned' }, origin)

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState  = cookieStore.get('drive_oauth_state')?.value
  cookieStore.delete('drive_oauth_state')

  if (!savedState || savedState !== state) {
    return popupResponse({ driveError: 'Invalid state parameter — please try again' }, origin)
  }

  // Require authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return popupResponse({ driveError: 'Not authenticated' }, origin)

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return popupResponse({ driveError: 'Google OAuth not configured on the server' }, origin)
  }

  // Exchange authorization code for tokens
  const redirectUri = `${origin}/api/expenses-manager/drive/callback`
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
      origin,
    )
  }

  if (!tokens.refresh_token) {
    // Happens if the user had already granted access and we didn't get a fresh refresh_token.
    // The auth route uses prompt=consent to prevent this, but handle it defensively.
    return popupResponse(
      { driveError: 'No refresh token returned. Revoke app access in Google Account settings and try again.' },
      origin,
    )
  }

  // Persist refresh token in Supabase user_metadata (server-side only — never sent to client)
  const { error: updateErr } = await supabase.auth.updateUser({
    data: { drive_refresh_token: tokens.refresh_token },
  })

  if (updateErr) {
    return popupResponse({ driveError: `Failed to save credentials: ${updateErr.message}` }, origin)
  }

  return popupResponse({ driveConnected: true }, origin)
}
