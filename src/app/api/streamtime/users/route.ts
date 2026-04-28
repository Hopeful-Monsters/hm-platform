import { requireToolAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import type { EnrichedUser, Team } from '@/app/streamtime-reviewer/_components/types'

const ST_BASE = 'https://api.streamtime.net/v2'
const TEAM_LABELS = ['Creative', 'Execution', 'Strategy'] as const
const ORG_ID = 'default'

function stHeaders() {
  return {
    Authorization: `Bearer ${process.env.STREAMTIME_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function extractLabels(user: Record<string, unknown>): string[] {
  const raw = user.labels
  if (!Array.isArray(raw)) return []
  return raw
    .map((l: unknown) => (typeof l === 'object' && l !== null ? (l as Record<string, unknown>).name : l))
    .filter((n): n is string => typeof n === 'string')
}

function deriveTeam(labels: string[]): Team {
  for (const tl of TEAM_LABELS) {
    if (labels.includes(tl)) return tl
  }
  return 'Support'
}

export async function GET() {
  try {
    await requireToolAccess('streamtime-reviewer')

    if (!process.env.STREAMTIME_API_TOKEN) {
      return Response.json({ error: 'STREAMTIME_API_TOKEN is not configured' }, { status: 500 })
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

    const users: EnrichedUser[] = active.map(u => {
      const firstName = typeof u.firstName === 'string' ? u.firstName : ''
      const lastName  = typeof u.lastName  === 'string' ? u.lastName  : ''
      const displayName = typeof u.displayName === 'string' ? u.displayName : ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || displayName || String(u.id)
      const labels = extractLabels(u)
      const id = Number(u.id)

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    const status = msg === 'Unauthorized' ? 401 : msg.startsWith('No access') ? 403 : 500
    return Response.json({ error: msg }, { status })
  }
}
