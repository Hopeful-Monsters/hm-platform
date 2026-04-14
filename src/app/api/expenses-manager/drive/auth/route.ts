import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export async function GET(request: Request) {
  // Auth check — user must be signed in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 })
  }

  // CSRF state — stored in an httpOnly cookie, verified in the callback
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('drive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const origin      = new URL(request.url).origin
  const redirectUri = `${origin}/api/expenses-manager/drive/callback`

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         DRIVE_SCOPE,
    access_type:   'offline',
    prompt:        'consent', // Force consent screen to always get a refresh_token
    state,
  })

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
