import { createServiceClient } from '@/lib/supabase/service'
import { ST_BASE, stHeaders } from '@/lib/streamtime/client'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'
import type { EnrichedUser, Team } from '@/app/streamtime-reviewer/_components/types'

const TEAM_LABELS = ['Creative', 'Execution', 'Strategy'] as const
const ORG_ID = 'default'

function deriveTeam(labels: string[]): Team {
  for (const tl of TEAM_LABELS) {
    if (labels.includes(tl)) return tl
  }
  return 'Support'
}

export const GET = createApiRoute({
  auth: { tool: 'streamtime-reviewer' },
  handler: async () => {
    if (!process.env.STREAMTIME_KEY) {
      throw new HttpError(500, 'STREAMTIME_KEY is not configured')
    }

    const r = await fetch(`${ST_BASE}/users`, { headers: stHeaders() })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`Streamtime /users ${r.status}: ${body}`)
    }
    const data = await r.json()
    const raw: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data.searchResults ?? [])

    const supabase = createServiceClient()
    const { data: targets } = await supabase
      .from('streamtime_user_targets')
      .select('streamtime_user_id, target_pct')
      .eq('org_id', ORG_ID)

    const targetMap = new Map<string, number>(
      (targets ?? []).map(t => [t.streamtime_user_id, Number(t.target_pct)])
    )

    // userStatus.id: 1=Active, 2=Hibernated, 3=Deleted — exclude non-active users
    const active = raw.filter(u => {
      const status = (u.userStatus ?? {}) as Record<string, unknown>
      const statusId = Number(status.id ?? 1)
      return statusId === 1
    })

    // The v2 /users endpoint does not include labels — fetch them separately.
    // POST /labels/search with { User: [id, ...] } returns models grouped by entityId.
    const userIds = active.map(u => Number(u.id)).filter(id => id > 0)
    const userLabelMap = new Map<number, string[]>()

    if (userIds.length > 0) {
      try {
        const labelsRes = await fetch(`${ST_BASE}/labels/search`, {
          method: 'POST',
          headers: stHeaders(),
          body: JSON.stringify({ User: userIds }),
        })
        if (labelsRes.ok) {
          const labelsData = await labelsRes.json()
          const modelSet = (labelsData.__modelSet ?? []) as Record<string, unknown>[]
          const models = ((modelSet[0]?.models ?? []) as Record<string, unknown>[])
          for (const label of models) {
            if (label.active === false) continue
            const uid = Number(label.entityId)
            if (!userLabelMap.has(uid)) userLabelMap.set(uid, [])
            userLabelMap.get(uid)!.push(String(label.name))
          }
        }
      } catch {
        // Labels fetch failed; users will have empty labels and default to Support team
      }
    }

    const users: EnrichedUser[] = active.map(u => {
      const firstName = typeof u.firstName === 'string' ? u.firstName : ''
      const lastName  = typeof u.lastName  === 'string' ? u.lastName  : ''
      const displayName = typeof u.displayName === 'string' ? u.displayName : ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || displayName || String(u.id)
      const id = Number(u.id)
      const labels = userLabelMap.get(id) ?? []

      return {
        id,
        fullName,
        labels,
        team: deriveTeam(labels),
        isLeadership: labels.includes('Leadership'),
        targetPct: targetMap.get(String(id)) ?? null,
        hoursWorkedSunday:    Number(u.hoursWorkedSunday    ?? 0),
        hoursWorkedMonday:    Number(u.hoursWorkedMonday    ?? 0),
        hoursWorkedTuesday:   Number(u.hoursWorkedTuesday   ?? 0),
        hoursWorkedWednesday: Number(u.hoursWorkedWednesday ?? 0),
        hoursWorkedThursday:  Number(u.hoursWorkedThursday  ?? 0),
        hoursWorkedFriday:    Number(u.hoursWorkedFriday    ?? 0),
        hoursWorkedSaturday:  Number(u.hoursWorkedSaturday  ?? 0),
      }
    })

    return Response.json({ users })
  },
})
