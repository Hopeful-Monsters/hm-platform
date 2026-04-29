import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'

const ORG_ID = 'default'

const UserStatSchema = z.object({
  streamtimeUserId: z.string(),
  displayName:      z.string(),
  team:             z.string(),
  isLeadership:     z.boolean(),
  capacityHours:    z.number(),
  billableHours:    z.number(),
  nonBillableHours: z.number(),
  oooHours:         z.number(),
  totalHours:       z.number(),
  workingHours:     z.number(),
  billablePct:      z.number(),
  targetPct:        z.number().nullable(),
  diffPct:          z.number().nullable(),
})

const PostBodySchema = z.object({
  dateFrom:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryCount: z.number().int().min(0),
  userStats:  z.array(UserStatSchema),
})

export const GET = createApiRoute({
  auth: { tool: 'streamtime-reviewer' },
  handler: async () => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('streamtime_weekly_reports')
      .select('id, date_from, date_to, entry_count, saved_at')
      .eq('org_id', ORG_ID)
      .order('date_from', { ascending: false })
    if (error) throw error
    const reports = (data ?? []).map(r => ({
      id:         r.id,
      dateFrom:   r.date_from,
      dateTo:     r.date_to,
      entryCount: r.entry_count,
      savedAt:    r.saved_at,
    }))
    return Response.json({ reports })
  },
})

export const POST = createApiRoute({
  auth:   'admin',
  schema: PostBodySchema,
  handler: async ({ user, body }) => {
    const { dateFrom, dateTo, entryCount, userStats } = body
    const supabase = createServiceClient()

    const { data: report, error: reportErr } = await supabase
      .from('streamtime_weekly_reports')
      .upsert(
        { org_id: ORG_ID, date_from: dateFrom, date_to: dateTo, entry_count: entryCount,
          saved_by: user!.id, saved_at: new Date().toISOString() },
        { onConflict: 'org_id,date_from,date_to' }
      )
      .select('id')
      .single()
    if (reportErr) throw reportErr

    await supabase.from('streamtime_weekly_user_stats').delete().eq('report_id', report.id)

    const { error: statsErr } = await supabase
      .from('streamtime_weekly_user_stats')
      .insert(userStats.map(s => ({
        report_id:          report.id,
        streamtime_user_id: s.streamtimeUserId,
        display_name:       s.displayName,
        team:               s.team,
        is_leadership:      s.isLeadership,
        capacity_hours:     s.capacityHours,
        billable_hours:     s.billableHours,
        non_billable_hours: s.nonBillableHours,
        ooo_hours:          s.oooHours,
        total_hours:        s.totalHours,
        working_hours:      s.workingHours,
        billable_pct:       s.billablePct,
        target_pct:         s.targetPct,
        diff_pct:           s.diffPct,
      })))
    if (statsErr) throw statsErr

    return Response.json({ id: report.id }, { status: 201 })
  },
})
