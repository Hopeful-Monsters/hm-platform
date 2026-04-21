/**
 * /api/coverage-tracker/settings/publication-groups/[id]
 *
 * PATCH  — Add or remove members from an existing publication group.
 *           Body: { addMembers?: string[], removeIds?: string[] }
 *           Requires: admin or editor role.
 *
 * DELETE — Delete the entire publication group (and cascade-delete its members
 *           via the FK constraint). Requires: admin or editor role.
 */

import { z } from 'zod'
import { requireSettingsAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const PatchGroupSchema = z.object({
  addMembers: z.array(z.string().min(1).max(500)).max(2000).optional(),
  removeIds:  z.array(z.string().uuid()).max(2000).optional(),
})

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSettingsAccess().catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const raw    = await request.json().catch(() => null)
  const parsed = PatchGroupSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    )
  }

  const { addMembers = [], removeIds = [] } = parsed.data

  if (addMembers.length === 0 && removeIds.length === 0) {
    return Response.json({ error: 'Nothing to update — provide addMembers or removeIds' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify group exists (and belongs to default org)
  const { data: group, error: groupError } = await supabase
    .from('coverage_tracker_publication_groups')
    .select('id')
    .eq('id', id)
    .eq('org_id', 'default')
    .single()

  if (groupError || !group) {
    return Response.json({ error: 'Publication group not found' }, { status: 404 })
  }

  const errors: string[] = []

  // Remove members
  if (removeIds.length > 0) {
    const { error: removeError } = await supabase
      .from('coverage_tracker_publication_group_members')
      .delete()
      .eq('group_id', id)
      .in('id', removeIds)

    if (removeError) {
      console.error('[publication-groups/[id]] DELETE members failed:', removeError.message)
      errors.push('Failed to remove some members')
    }
  }

  // Add members
  if (addMembers.length > 0) {
    const rows = addMembers.map(value => ({ group_id: id, value }))
    const { error: insertError } = await supabase
      .from('coverage_tracker_publication_group_members')
      .insert(rows)

    if (insertError) {
      console.error('[publication-groups/[id]] INSERT members failed:', insertError.message)
      errors.push('Failed to add some members')
    }
  }

  if (errors.length > 0) {
    return Response.json({ error: errors.join('; ') }, { status: 500 })
  }

  // Return updated member list
  const { data: members, error: membersError } = await supabase
    .from('coverage_tracker_publication_group_members')
    .select('id, value')
    .eq('group_id', id)
    .order('value', { ascending: true })

  if (membersError) {
    console.error('[publication-groups/[id]] GET updated members failed:', membersError.message)
    return Response.json({ success: true, members: [] })
  }

  return Response.json({ success: true, members: members ?? [] })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSettingsAccess().catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()

  // Verify group exists and belongs to default org before deleting
  const { data: group, error: groupError } = await supabase
    .from('coverage_tracker_publication_groups')
    .select('id')
    .eq('id', id)
    .eq('org_id', 'default')
    .single()

  if (groupError || !group) {
    return Response.json({ error: 'Publication group not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('coverage_tracker_publication_groups')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[publication-groups/[id]] DELETE group failed:', deleteError.message)
    return Response.json({ error: 'Failed to delete group' }, { status: 500 })
  }

  return Response.json({ success: true })
}
