/**
 * /api/coverage-tracker/settings/publication-groups
 *
 * GET  — Returns all publication groups for the default org, each including
 *        their member values. Requires: approved user (any role).
 *
 * POST — Creates a new publication group (name + optional members).
 *        Requires: admin or editor role.
 *
 * Individual group management (rename, delete, add/remove members) lives at:
 *   /api/coverage-tracker/settings/publication-groups/[id]
 *   (implemented in PR 2 alongside the Settings UI)
 */

import { z } from 'zod'
import { requireToolAccess, requireSettingsAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ORG_ID = 'default'

const CreateGroupSchema = z.object({
  name:    z.string().min(1).max(200),
  note:    z.string().max(500).optional(),
  members: z.array(z.string().min(1).max(500)).max(2000).optional(),
})

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await requireToolAccess('coverage-tracker').catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()

  const { data: groups, error: groupsError } = await supabase
    .from('coverage_tracker_publication_groups')
    .select('id, name, note, created_at')
    .eq('org_id', ORG_ID)
    .order('name', { ascending: true })

  if (groupsError) {
    console.error('[settings/publication-groups] GET groups failed:', groupsError.message)
    return Response.json({ error: 'Failed to load publication groups' }, { status: 500 })
  }

  if (!groups?.length) {
    return Response.json({ groups: [] })
  }

  // Fetch members for all groups in one query
  const groupIds = groups.map(g => g.id)
  const { data: members, error: membersError } = await supabase
    .from('coverage_tracker_publication_group_members')
    .select('id, group_id, value')
    .in('group_id', groupIds)
    .order('value', { ascending: true })

  if (membersError) {
    console.error('[settings/publication-groups] GET members failed:', membersError.message)
    return Response.json({ error: 'Failed to load group members' }, { status: 500 })
  }

  // Shape: attach members to their parent group
  const membersByGroup = (members ?? []).reduce<Record<string, { id: string; value: string }[]>>(
    (acc, m) => {
      if (!acc[m.group_id]) acc[m.group_id] = []
      acc[m.group_id].push({ id: m.id, value: m.value })
      return acc
    },
    {}
  )

  const result = groups.map(g => ({
    ...g,
    members: membersByGroup[g.id] ?? [],
  }))

  return Response.json({ groups: result })
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const user = await requireSettingsAccess().catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw    = await request.json().catch(() => null)
  const parsed = CreateGroupSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    )
  }

  const { name, note, members = [] } = parsed.data
  const supabase = createServiceClient()

  // Insert group
  const { data: group, error: groupError } = await supabase
    .from('coverage_tracker_publication_groups')
    .insert({ org_id: ORG_ID, name, note: note ?? null, created_by: user.id })
    .select('id, name, note, created_at')
    .single()

  if (groupError) {
    // Unique constraint = duplicate name
    if (groupError.code === '23505') {
      return Response.json({ error: `A group named "${name}" already exists` }, { status: 409 })
    }
    console.error('[settings/publication-groups] INSERT group failed:', groupError.message)
    return Response.json({ error: 'Failed to create group' }, { status: 500 })
  }

  // Insert members if provided
  if (members.length > 0) {
    const memberRows = members.map(value => ({ group_id: group.id, value }))
    const { error: membersError } = await supabase
      .from('coverage_tracker_publication_group_members')
      .insert(memberRows)

    if (membersError) {
      // Non-fatal — group was created, members failed. Return partial success.
      console.warn('[settings/publication-groups] INSERT members failed:', membersError.message)
      return Response.json({
        group: { ...group, members: [] },
        warning: 'Group created but members could not be saved. Add them again from the Settings panel.',
      }, { status: 207 })
    }
  }

  return Response.json({
    group: {
      ...group,
      members: members.map(value => ({ value })),
    }
  }, { status: 201 })
}
