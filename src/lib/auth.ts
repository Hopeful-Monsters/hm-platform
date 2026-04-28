import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ToolSlug } from '@/lib/tools';

/** Roles that can read/write org-level Settings */
const SETTINGS_ROLES = ['admin', 'editor'] as const
export type SettingsRole = typeof SETTINGS_ROLES[number]

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

/**
 * Verifies the current user is signed in, approved, and has either the
 * 'admin' or 'editor' role — the two roles permitted to read/write
 * org-level Settings (rules, publication groups, etc.).
 *
 * Tool access is NOT checked here; a user could theoretically be an editor
 * without having tool_access rows (e.g. an ops admin who manages settings
 * but doesn't use the tool themselves). If you also need tool access,
 * call requireToolAccess separately.
 */
export async function requireSettingsAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  if (user.user_metadata?.status !== 'approved') throw new Error('Account not approved')

  const role = user.user_metadata?.role as string | undefined
  if (!SETTINGS_ROLES.includes(role as SettingsRole)) {
    throw new Error('Insufficient permissions — admin or editor role required')
  }

  return user
}

/**
 * Verifies the current user is signed in, approved, and has the 'admin' role.
 * Used for operations restricted to admins only (e.g. writing billable targets).
 */
export async function requireAdminAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  if (user.user_metadata?.status !== 'approved') throw new Error('Account not approved')
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'admin') throw new Error('Admin role required')
  return user
}
