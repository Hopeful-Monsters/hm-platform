import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ToolSlug } from '@/lib/tools';

/**
 * Returns the current Supabase user, memoised for the duration of a single
 * server request via React's `cache()`. Any Server Component that calls this
 * (layout, page, async children) shares the same result — only one network
 * round-trip to Supabase per request regardless of how many components call it.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Verifies the current user is signed in, approved, and has a tool_access row
 * for the given slug. Throws on any failure. Use at the top of API routes and
 * Server Actions that belong to a specific tool — the middleware only gates page
 * routes, so API routes and actions must perform their own authorization checks.
 */
export async function requireToolAccess(toolSlug: ToolSlug) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  if (user.user_metadata?.status !== 'approved') throw new Error('Account not approved')

  const { data } = await supabase
    .from('tool_access')
    .select('plan')
    .eq('user_id', user.id)
    .eq('tool_slug', toolSlug)
    .maybeSingle()

  if (!data) throw new Error('No access to this tool')
  return user
}
