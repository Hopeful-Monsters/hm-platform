import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'

const ORG_ID = 'default'

const TargetSchema = z.object({
  streamtimeUserId: z.string().min(1),
  displayName:      z.string().min(1),
  targetPct:        z.number().min(0).max(100),
})

const PutBodySchema = z.object({
  targets: z.array(TargetSchema),
})

export const GET = createApiRoute({
  auth: { tool: 'streamtime-reviewer' },
  handler: async () => {
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
  },
})

export const PUT = createApiRoute({
  auth:   'admin',
  schema: PutBodySchema,
  handler: async ({ user, body }) => {
    const supabase = createServiceClient()
    const rows = body.targets.map(t => ({
      org_id:             ORG_ID,
      streamtime_user_id: t.streamtimeUserId,
      display_name:       t.displayName,
      target_pct:         t.targetPct,
      updated_at:         new Date().toISOString(),
      updated_by:         user!.id,
    }))

    const { error } = await supabase
      .from('streamtime_user_targets')
      .upsert(rows, { onConflict: 'org_id,streamtime_user_id' })
    if (error) throw error

    return Response.json({ ok: true })
  },
})
