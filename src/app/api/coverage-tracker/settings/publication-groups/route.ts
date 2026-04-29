/**
 * /api/coverage-tracker/settings/publication-groups
 *
 * GET  — Returns all publication groups for the default org, each including
 *        their member values. Requires: approved user with tool access.
 *
 * POST — Creates a new publication group (name + optional members).
 *        Requires: admin or editor role.
 *
 * Individual group management (rename, delete, add/remove members) lives at:
 *   /api/coverage-tracker/settings/publication-groups/[id]
 */

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

const ORG_ID = 'default'

const CreateGroupSchema = z.object({
  name:    z.string().min(1).max(200),
  note:    z.string().max(500).optional(),
  members: z.array(z.string().min(1).max(500)).max(2000).optional(),
})

export const GET = createApiRoute({
  auth: { tool: 'coverage-tracker' },
  handler: async () => {
    const supabase = createServiceClient()

    const { data: groups, error: groupsError } = await supabase
      .from('coverage_tracker_publication_groups')
      .select('id, name, note, created_at')
      .eq('org_id', ORG_ID)
      .order('name', { ascending: true })

    if (groupsError) {
      console.error('[settings/publication-groups] GET groups failed:', groupsError.message)
      throw new HttpError(500, 'Failed to load publication groups')
    }

    if (!groups?.length) return Response.json({ groups: [] })

    const groupIds = groups.map(g => g.id)
    const { data: members, error: membersError } = await supabase
      .from('coverage_tracker_publication_group_members')
      .select('id, group_id, value')
      .in('group_id', groupIds)
      .order('value', { ascending: true })

    if (membersError) {
      console.error('[settings/publication-groups] GET members failed:', membersError.message)
      throw new HttpError(500, 'Failed to load group members')
    }

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
  },
})

export const POST = createApiRoute({
  auth:   'settings',
  schema: CreateGroupSchema,
  handler: async ({ user, body }) => {
    const { name, note, members = [] } = body
    const supabase = createServiceClient()

    const { data: group, error: groupError } = await supabase
      .from('coverage_tracker_publication_groups')
      .insert({ org_id: ORG_ID, name, note: note ?? null, created_by: user!.id })
      .select('id, name, note, created_at')
      .single()

    if (groupError) {
      // Unique constraint = duplicate name
      if (groupError.code === '23505') {
        throw new HttpError(409, `A group named "${name}" already exists`)
      }
      console.error('[settings/publication-groups] INSERT group failed:', groupError.message)
      throw new HttpError(500, 'Failed to create group')
    }

    if (members.length > 0) {
      const memberRows = members.map(value => ({ group_id: group.id, value }))
      const { error: membersError } = await supabase
        .from('coverage_tracker_publication_group_members')
        .insert(memberRows)

      if (membersError) {
        // Non-fatal — group was created, members failed. Return partial success.
        console.warn('[settings/publication-groups] INSERT members failed:', membersError.message)
        return Response.json({
          group:   { ...group, members: [] },
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
  },
})
