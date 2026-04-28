import { z } from 'zod'
import { requireToolAccess, requireAdminAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ORG_ID = 'default'

const TargetSchema = z.object({
  streamtimeUserId: z.string().min(1),
  displayName:      z.string().min(1),
  targetPct:        z.number().min(0).max(100),
})

const PutBodySchema = z.object({
  targets: z.array(TargetSchema),
})

export async function GET() {
  try {
    await requireToolAccess('streamtime-reviewer')
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('streamtime_user_targets')
      .select('streamtime_user_id, display_name, target_pct')
      .eq('org_id', ORG_ID)
    if (error) throw error
    const targets = (data ?? []).map(t => ({
      streamtimeUserId: t.streamtime_user_id,
      displayName:      t.display_name,
      targetPct:        Number(t.target_pct),
    }))
    return Response.json({ targets })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    const status = msg === 'Unauthorized' ? 401 : msg.startsWith('No access') ? 403 : 500
    return Response.json({ error: msg }, { status })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAdminAccess()
    const body = PutBodySchema.safeParse(await req.json())
    if (!body.success) return Response.json({ error: 'Invalid payload' }, { status: 400 })

    const supabase = createServiceClient()
    const rows = body.data.targets.map(t => ({
      org_id:             ORG_ID,
      streamtime_user_id: t.streamtimeUserId,
      display_name:       t.displayName,
      target_pct:         t.targetPct,
      updated_at:         new Date().toISOString(),
      updated_by:         user.id,
    }))

    const { error } = await supabase
      .from('streamtime_user_targets')
      .upsert(rows, { onConflict: 'org_id,streamtime_user_id' })
    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Admin role required' ? 403 : 500
    return Response.json({ error: msg }, { status })
  }
}
