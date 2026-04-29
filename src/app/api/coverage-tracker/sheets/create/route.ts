/**
 * POST /api/coverage-tracker/sheets/create
 *
 * Creates a new Google Spreadsheet with the Coverage Tracker header row,
 * appends the provided rows, and shares the sheet with the requesting
 * user's email.
 */

import { z } from 'zod'
import { rateLimits } from '@/lib/upstash/ratelimit'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getGoogleAccessToken,
  createSpreadsheet,
  appendRows,
  shareSheet,
} from '@/lib/google/sheets'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

const CellValue = z.union([z.string(), z.number()])

const CreateBodySchema = z.object({
  sheetTitle: z.string().min(1).max(200),
  sheetTab:   z.string().min(1).max(200),
  rows:       z.array(z.array(CellValue).length(16)).min(1).max(500),
  shareEmail: z.string().email().max(254).optional(),
  campaign:   z.string().max(200).optional(),
})

export const POST = createApiRoute({
  auth:      { tool: 'coverage-tracker' },
  schema:    CreateBodySchema,
  rateLimit: {
    limiter: rateLimits.api,
    key:     user => `coverage-tracker:create:${user.id}`,
  },
  handler: async ({ user, body }) => {
    const { sheetTitle, sheetTab, rows, shareEmail, campaign } = body

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
      try {
        await createServiceClient().from('drive_tokens').delete().eq('user_id', user!.id)
      } catch { /* non-fatal */ }
      throw new HttpError(401, `Drive auth expired — please reconnect. (${(err as Error).message})`)
    }

    let newSheetId: string
    try {
      newSheetId = await createSpreadsheet(accessToken, sheetTitle, sheetTab)
      await appendRows(accessToken, newSheetId, sheetTab, rows)
      if (shareEmail) {
        await shareSheet(accessToken, newSheetId, shareEmail)
      }
    } catch (err) {
      throw new HttpError(400, (err as Error).message)
    }

    try {
      await createServiceClient()
        .from('coverage_submissions')
        .insert({
          user_id:   user!.id,
          sheet_id:  newSheetId,
          sheet_tab: sheetTab,
          campaign:  campaign ?? null,
          row_count: rows.length,
          mode:      'new',
        })
    } catch (err) {
      console.warn('[coverage-tracker] submission log failed:', (err as Error).message)
    }

    return Response.json({
      success:     true,
      newSheetUrl: `https://docs.google.com/spreadsheets/d/${newSheetId}`,
    })
  },
})
