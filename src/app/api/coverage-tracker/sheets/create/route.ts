/**
 * POST /api/coverage-tracker/sheets/create
 *
 * Creates a new Google Spreadsheet with the Coverage Tracker header row,
 * appends the provided rows, and shares the sheet with the requesting user's email.
 *
 * Body:
 *   sheetTitle — Title for the new spreadsheet
 *   sheetTab   — Tab name
 *   rows       — Array of value arrays, each with 16 values matching COVERAGE_HEADERS
 *   shareEmail — Email address to share the new sheet with (Editor access)
 *   campaign   — Campaign name (for submission log)
 */

import { z } from 'zod'
import { requireToolAccess } from '@/lib/auth'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getGoogleAccessToken,
  createSpreadsheet,
  appendRows,
  shareSheet,
} from '@/lib/google/sheets'

const CellValue = z.union([z.string(), z.number()])

const CreateBodySchema = z.object({
  sheetTitle: z.string().min(1).max(200),
  sheetTab:   z.string().min(1).max(200),
  rows:       z.array(z.array(CellValue).length(16)).min(1).max(500),
  shareEmail: z.string().email().max(254).optional(),
  campaign:   z.string().max(200).optional(),
})

export async function POST(request: Request) {
  // Auth — must be signed in, approved, and have coverage-tracker access
  const user = await requireToolAccess('coverage-tracker').catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Rate limit
  const limited = await applyRateLimit(rateLimits.api, `coverage-tracker:create:${user.id}`)
  if (limited) return limited

  // Validate body
  const raw    = await request.json().catch(() => null)
  const parsed = CreateBodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    )
  }
  const { sheetTitle, sheetTab, rows, shareEmail, campaign } = parsed.data

  // Retrieve user's Drive refresh token
  const { data: tokenRow } = await createServiceClient()
    .from('drive_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tokenRow?.refresh_token) {
    return Response.json(
      { error: 'Google Drive not connected. Connect Drive from the Coverage Tracker.' },
      { status: 403 },
    )
  }

  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(tokenRow.refresh_token as string)
  } catch (err: unknown) {
    try {
      await createServiceClient().from('drive_tokens').delete().eq('user_id', user.id)
    } catch { /* non-fatal */ }
    return Response.json(
      { error: `Drive auth expired — please reconnect. (${(err as Error).message})` },
      { status: 401 },
    )
  }

  // Create spreadsheet, append rows, share with user
  let newSheetId: string
  try {
    newSheetId = await createSpreadsheet(accessToken, sheetTitle, sheetTab)
    await appendRows(accessToken, newSheetId, sheetTab, rows)
    if (shareEmail) {
      await shareSheet(accessToken, newSheetId, shareEmail)
    }
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }

  // Log submission (non-fatal — don't fail the request if logging fails)
  try {
    await createServiceClient()
      .from('coverage_submissions')
      .insert({
        user_id:   user.id,
        sheet_id:  newSheetId,
        sheet_tab: sheetTab,
        campaign:  campaign ?? null,
        row_count: rows.length,
        mode:      'new',
      })
  } catch (err: unknown) {
    console.warn('[coverage-tracker] submission log failed:', (err as Error).message)
  }

  return Response.json({
    success:     true,
    newSheetUrl: `https://docs.google.com/spreadsheets/d/${newSheetId}`,
  })
}
