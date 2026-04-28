import { z } from 'zod'
import { requireToolAccess, requireAdminAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ORG_ID = 'default'

const PutBodySchema = z.object({
  oooPhrase: z.string().min(1).max(200),
})

export async function GET() {
  try {
    await requireToolAccess('streamtime-reviewer')
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('streamtime_settings')
      .select('ooo_phrase')
      .eq('org_id', ORG_ID)
      .single()
    return Response.json({ oooPhrase: data?.ooo_phrase ?? 'out of office' })
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
    const { error } = await supabase
      .from('streamtime_settings')
      .upsert({
        org_id:     ORG_ID,
        ooo_phrase: body.data.oooPhrase,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'org_id' })
    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Admin role required' ? 403 : 500
    return Response.json({ error: msg }, { status })
  }
}
