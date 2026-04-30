'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Trigger Google OAuth sign-in/sign-up. Returns the Supabase auth response
 * so callers can surface the error themselves (UI varies between
 * sign-in and sign-up screens).
 *
 * `redirectPath` is appended to the current origin and used as Supabase's
 * post-OAuth redirect target. Defaults to `/callback` (the platform's
 * canonical OAuth landing route).
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  redirectPath: string = '/callback',
) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options:  { redirectTo: `${window.location.origin}${redirectPath}` },
  })
}
