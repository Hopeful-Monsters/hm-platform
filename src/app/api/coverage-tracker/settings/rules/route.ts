/**
 * /api/coverage-tracker/settings/rules
 *
 * GET  — Returns all rules for the default org, ordered by sort_order.
 *        Requires: approved user (any role).
 *
 * PUT  — Replaces the full rule list for the default org (array replace,
 *        not a patch). Client sends the complete desired state; the handler
 *        deletes removed rules and upserts new/updated ones.
 *        Requires: admin or editor role.
 *
 * All rules are scoped to org_id = 'default'. Multi-org support requires
 * passing org_id in the request; leave that for when the orgs table exists.
 */

import { z } from 'zod'
import { requireToolAccess, requireSettingsAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ORG_ID = 'default'

// ── Zod schemas ──────────────────────────────────────────────────────────────

const RuleSchema = z.object({
  id:          z.string().uuid().optional(),     // omit for new rules; server assigns uuid
  sort_order:  z.number().int().min(0),
  enabled:     z.boolean().default(true),
  rule_type:   z.enum(['set', 'remap']),
  if_field:    z.string().min(1).max(100),
  if_operator: z.enum(['eq', 'neq', 'in']),
  if_value:    z.string().max(500).nullable().optional(),
  if_group_id: z.string().uuid().nullable().optional(),
  then_field:  z.string().min(1).max(100),
  then_value:  z.string().min(1).max(500),
  note:        z.string().max(500).nullable().optional(),
}).refine(
  r => r.if_operator !== 'in' || !!r.if_group_id,
  { message: "if_operator 'in' requires if_group_id" }
).refine(
  r => r.if_operator === 'in' || !!r.if_value,
  { message: "if_operator 'eq'/'neq' requires if_value" }
)

const PutBodySchema = z.object({
  rules: z.array(RuleSchema).max(200),
})

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  // Any approved user can read rules (they need them to understand the UI behaviour)
  const user = await requireToolAccess('coverage-tracker').catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('coverage_tracker_rules')
    .select('id, sort_order, enabled, rule_type, if_field, if_operator, if_value, if_group_id, then_field, then_value, note, created_at')
    .eq('org_id', ORG_ID)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[settings/rules] GET failed:', error.message)
    return Response.json({ error: 'Failed to load rules' }, { status: 500 })
  }

  return Response.json({ rules: data ?? [] })
}

// ── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  // Only admin/editor can write settings
  const user = await requireSettingsAccess().catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw    = await request.json().catch(() => null)
  const parsed = PutBodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    )
  }

  const { rules } = parsed.data
  const supabase  = createServiceClient()

  // Strategy: delete all existing rules for this org, then insert the new set.
  // Simple and race-condition-free given single-org, low-traffic settings writes.
  // For high-concurrency multi-org deployments, switch to individual upserts keyed on id.
  const { error: delError } = await supabase
    .from('coverage_tracker_rules')
    .delete()
    .eq('org_id', ORG_ID)

  if (delError) {
    console.error('[settings/rules] DELETE failed:', delError.message)
    return Response.json({ error: 'Failed to update rules' }, { status: 500 })
  }

  if (rules.length > 0) {
    const rows = rules.map((r, idx) => ({
      org_id:      ORG_ID,
      sort_order:  r.sort_order ?? idx,
      enabled:     r.enabled ?? true,
      rule_type:   r.rule_type,
      if_field:    r.if_field,
      if_operator: r.if_operator,
      if_value:    r.if_value    ?? null,
      if_group_id: r.if_group_id ?? null,
      then_field:  r.then_field,
      then_value:  r.then_value,
      note:        r.note        ?? null,
      created_by:  user.id,
    }))

    const { error: insertError } = await supabase
      .from('coverage_tracker_rules')
      .insert(rows)

    if (insertError) {
      console.error('[settings/rules] INSERT failed:', insertError.message)
      return Response.json({ error: 'Failed to save rules' }, { status: 500 })
    }
  }

  // Update the settings timestamp so consumers can cache-bust
  await supabase
    .from('coverage_tracker_settings')
    .update({ updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('org_id', ORG_ID)

  return Response.json({ success: true })
}
