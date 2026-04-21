/**
 * POST /api/coverage-tracker/sheets/append
 *
 * Appends processed coverage rows to an existing Google Spreadsheet tab.
 * Requires the user to have Google Drive connected (/api/drive/auth).
 *
 * Body:
 *   sheetId  — Google Sheets file ID (extracted from the sheet URL)
 *   sheetTab — Tab name (case-sensitive, must already exist)
 *   rows     — Array of value arrays, each with 16 values matching COVERAGE_HEADERS
 *   campaign — Campaign name (for submission log)
 */

import { z } from 'zod'
import { requireToolAccess } from '@/lib/auth'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getGoogleAccessToken,
  appendRows,
} from '@/lib/google/sheets'

const CellValue = z.union([z.string(), z.number()])

const AppendBodySchema = z.object({
  sheetId:  z.string().min(1).max(200),
  sheetTab: z.string().min(1).max(200),
  rows:     z.array(z.array(CellValue).length(16)).min(1).max(500),
  campaign: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  // Auth — must be signed in, approved, and have coverage-tracker access
  const user = await requireToolAccess('coverage-tracker').catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Rate limit
  const limited = await applyRateLimit(rateLimits.api, `coverage-tracker:append:${user.id}`)
  if (limited) return limited

  // Validate body
  const raw    = await request.json().catch(() => null)
  const parsed = AppendBodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    )
  }
  const { sheetId, sheetTab, rows, campaign } = parsed.data

  // Retrieve user's Drive refresh token (service role — never in client JWT)
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

  // Exchange refresh token for access token
  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(tokenRow.refresh_token as string)
  } catch (err: unknown) {
    // Token likely revoked — clear it so the UI shows disconnected state
    try {
      await createServiceClient().from('drive_tokens').delete().eq('user_id', user.id)
    } catch { /* non-fatal */ }
    return Response.json(
      { error: `Drive auth expired — please reconnect. (${(err as Error).message})` },
      { status: 401 },
    )
  }

  // Append rows to the sheet
  try {
    await appendRows(accessToken, sheetId, sheetTab, rows)
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }

  // Log submission (non-fatal — don't fail the request if logging fails)
  try {
    await createServiceClient()
      .from('coverage_submissions')
      .insert({
        user_id:   user.id,
        sheet_id:  sheetId,
        sheet_tab: sheetTab,
        campaign:  campaign ?? null,
        row_count: rows.length,
        mode:      'existing',
      })
  } catch (err: unknown) {
    console.warn('[coverage-tracker] submission log failed:', (err as Error).message)
  }

  return Response.json({ success: true })
}
