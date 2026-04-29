/**
 * POST /api/coverage-tracker/sheets/append
 *
 * Appends processed coverage rows to an existing Google Spreadsheet tab.
 * Requires the user to have Google Drive connected (/api/drive/auth).
 */

import { z } from 'zod'
import { rateLimits } from '@/lib/upstash/ratelimit'
import { createServiceClient } from '@/lib/supabase/service'
import { getGoogleAccessToken, appendRows } from '@/lib/google/sheets'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

const CellValue = z.union([z.string(), z.number()])

const AppendBodySchema = z.object({
  sheetId:  z.string().min(1).max(200),
  sheetTab: z.string().min(1).max(200),
  rows:     z.array(z.array(CellValue).length(16)).min(1).max(500),
  campaign: z.string().max(200).optional(),
})

export const POST = createApiRoute({
  auth:      { tool: 'coverage-tracker' },
  schema:    AppendBodySchema,
  rateLimit: {
    limiter: rateLimits.api,
    key:     user => `coverage-tracker:append:${user.id}`,
  },
  handler: async ({ user, body }) => {
    const { sheetId, sheetTab, rows, campaign } = body

    const { data: tokenRow } = await createServiceClient()
      .from('drive_tokens')
      .select('refresh_token')
      .eq('user_id', user!.id)
      .maybeSingle()

    if (!tokenRow?.refresh_token) {
      throw new HttpError(403, 'Google Drive not connected. Connect Drive from the Coverage Tracker.')
    }

    let accessToken: string
    try {
      accessToken = await getGoogleAccessToken(tokenRow.refresh_token as string)
    } catch (err) {
      // Token likely revoked — clear it so the UI shows disconnected state.
      try {
        await createServiceClient().from('drive_tokens').delete().eq('user_id', user!.id)
      } catch { /* non-fatal */ }
      throw new HttpError(401, `Drive auth expired — please reconnect. (${(err as Error).message})`)
    }

    try {
      await appendRows(accessToken, sheetId, sheetTab, rows)
    } catch (err) {
      throw new HttpError(400, (err as Error).message)
    }

    // Submission log is non-fatal.
    try {
      await createServiceClient()
        .from('coverage_submissions')
        .insert({
          user_id:   user!.id,
          sheet_id:  sheetId,
          sheet_tab: sheetTab,
          campaign:  campaign ?? null,
          row_count: rows.length,
          mode:      'existing',
        })
    } catch (err) {
      console.warn('[coverage-tracker] submission log failed:', (err as Error).message)
    }

    return Response.json({ success: true })
  },
})
