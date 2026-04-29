/**
 * /api/coverage-tracker/settings/publication-groups/[id]
 *
 * PATCH  — Add or remove members. Body: { addMembers?, removeIds? }.
 * DELETE — Delete the group (members cascade via FK).
 *
 * Both require admin or editor role.
 */

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'

type Params = { id: string }

const PatchGroupSchema = z.object({
  addMembers: z.array(z.string().min(1).max(500)).max(2000).optional(),
  removeIds:  z.array(z.string().uuid()).max(2000).optional(),
})

async function ensureGroupExists(id: string) {
  const supabase = createServiceClient()
  const { data: group, error } = await supabase
    .from('coverage_tracker_publication_groups')
    .select('id')
    .eq('id', id)
    .eq('org_id', 'default')
    .single()
  if (error || !group) throw new HttpError(404, 'Publication group not found')
}

export const PATCH = createApiRoute<z.infer<typeof PatchGroupSchema>, Params>({
  auth:   'settings',
  schema: PatchGroupSchema,
  handler: async ({ body, params }) => {
    const { addMembers = [], removeIds = [] } = body

    if (addMembers.length === 0 && removeIds.length === 0) {
      throw new HttpError(400, 'Nothing to update — provide addMembers or removeIds')
    }

    await ensureGroupExists(params.id)

    const supabase = createServiceClient()
    const errors: string[] = []

    if (removeIds.length > 0) {
      const { error: removeError } = await supabase
        .from('coverage_tracker_publication_group_members')
        .delete()
        .eq('group_id', params.id)
        .in('id', removeIds)

      if (removeError) {
        console.error('[publication-groups/[id]] DELETE members failed:', removeError.message)
        errors.push('Failed to remove some members')
      }
    }

    if (addMembers.length > 0) {
      const rows = addMembers.map(value => ({ group_id: params.id, value }))
      const { error: insertError } = await supabase
        .from('coverage_tracker_publication_group_members')
        .insert(rows)

      if (insertError) {
        console.error('[publication-groups/[id]] INSERT members failed:', insertError.message)
        errors.push('Failed to add some members')
      }
    }

    if (errors.length > 0) {
      throw new HttpError(500, errors.join('; '))
    }

    const { data: members, error: membersError } = await supabase
      .from('coverage_tracker_publication_group_members')
      .select('id, value')
      .eq('group_id', params.id)
      .order('value', { ascending: true })

    if (membersError) {
      console.error('[publication-groups/[id]] GET updated members failed:', membersError.message)
      return Response.json({ success: true, members: [] })
    }

    return Response.json({ success: true, members: members ?? [] })
  },
})

export const DELETE = createApiRoute<undefined, Params>({
  auth: 'settings',
  handler: async ({ params }) => {
    await ensureGroupExists(params.id)

    const supabase = createServiceClient()
    const { error: deleteError } = await supabase
      .from('coverage_tracker_publication_groups')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[publication-groups/[id]] DELETE group failed:', deleteError.message)
      throw new HttpError(500, 'Failed to delete group')
    }

    return Response.json({ success: true })
  },
})
