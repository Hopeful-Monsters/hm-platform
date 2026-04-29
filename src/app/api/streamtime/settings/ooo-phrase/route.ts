import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'

const ORG_ID = 'default'

export const GET = createApiRoute({
  auth: { tool: 'streamtime-reviewer' },
  handler: async () => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('streamtime_settings')
      .select('ooo_phrase')
      .eq('org_id', ORG_ID)
      .single()
    return Response.json({ oooPhrase: data?.ooo_phrase ?? 'out of office' })
  },
})

const PutBodySchema = z.object({
  oooPhrase: z.string().min(1).max(200),
})

export const PUT = createApiRoute({
  auth:   'admin',
  schema: PutBodySchema,
  handler: async ({ user, body }) => {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('streamtime_settings')
      .upsert({
        org_id:     ORG_ID,
        ooo_phrase: body.oooPhrase,
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      }, { onConflict: 'org_id' })
    if (error) throw error
    return Response.json({ ok: true })
  },
})
