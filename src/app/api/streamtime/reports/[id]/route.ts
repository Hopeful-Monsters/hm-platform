import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

type Params = { id: string }

export const GET = createApiRoute<undefined, Params>({
  auth: { tool: 'streamtime-reviewer' },
  handler: async ({ params }) => {
    const supabase = createServiceClient()

    const { data: report, error: rErr } = await supabase
      .from('streamtime_weekly_reports')
      .select('id, date_from, date_to, entry_count, saved_at')
      .eq('id', params.id)
      .single()
    if (rErr || !report) throw new HttpError(404, 'Not found')

    const { data: stats, error: sErr } = await supabase
      .from('streamtime_weekly_user_stats')
      .select('*')
      .eq('report_id', params.id)
    if (sErr) throw sErr

    return Response.json({
      id:         report.id,
      dateFrom:   report.date_from,
      dateTo:     report.date_to,
      entryCount: report.entry_count,
      savedAt:    report.saved_at,
      userStats: (stats ?? []).map(s => ({
        streamtimeUserId: s.streamtime_user_id,
        displayName:      s.display_name,
        team:             s.team,
        isLeadership:     s.is_leadership,
        capacityHours:    Number(s.capacity_hours),
        billableHours:    Number(s.billable_hours),
        nonBillableHours: Number(s.non_billable_hours),
        oooHours:         Number(s.ooo_hours),
        totalHours:       Number(s.total_hours),
        workingHours:     Number(s.working_hours),
        billablePct:      Number(s.billable_pct),
        targetPct:        s.target_pct !== null ? Number(s.target_pct) : null,
        diffPct:          s.diff_pct   !== null ? Number(s.diff_pct)   : null,
      })),
    })
  },
})

export const DELETE = createApiRoute<undefined, Params>({
  auth: 'admin',
  handler: async ({ params }) => {
    const supabase = createServiceClient()
    await supabase.from('streamtime_weekly_user_stats').delete().eq('report_id', params.id)
    const { error } = await supabase.from('streamtime_weekly_reports').delete().eq('id', params.id)
    if (error) throw error
    return Response.json({ ok: true })
  },
})
