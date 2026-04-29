/**
 * GET /api/drive/status
 *
 * Returns whether the current user has a stored Drive refresh token.
 * Reads from drive_tokens via service role — token value is never returned.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

export const GET = createApiRoute({
  auth: 'user',
  handler: async ({ user }) => {
    if (user!.user_metadata?.status !== 'approved') {
      throw new HttpError(403, 'Account not approved')
    }

    const { data } = await createServiceClient()
      .from('drive_tokens')
      .select('user_id')
      .eq('user_id', user!.id)
      .maybeSingle()

    return Response.json({ connected: !!data })
  },
})
