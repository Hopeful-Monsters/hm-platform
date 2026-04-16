/**
 * GET /api/drive/status
 *
 * Returns whether the current user has a stored Drive refresh token.
 * Used by any tool that requires Drive access to show a connect/disconnect UI.
 *
 * Reads from drive_tokens via service role — token value is never returned.
 */

import { getCurrentUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ connected: false }, { status: 401 })
  if (user.user_metadata?.status !== 'approved') {
    return Response.json({ connected: false }, { status: 403 })
  }

  const { data } = await createServiceClient()
    .from('drive_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return Response.json({ connected: !!data })
}
