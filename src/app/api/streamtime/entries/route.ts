import { z } from 'zod'
import { requireToolAccess } from '@/lib/auth'
import type { NormalizedEntry } from '@/app/streamtime-reviewer/_components/types'

const ST_BASE = 'https://api.streamtime.net/v2'
const BATCH   = 1000

function stHeaders() {
  return {
    Authorization: `Bearer ${process.env.STREAMTIME_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

const BodySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Fallback: filter group type 35 is the logged-time date field per the Streamtime API docs.
const DATE_FILTER_FALLBACK = 35

async function fetchDateFilterTypeId(): Promise<number> {
  try {
    const r = await fetch(`${ST_BASE}/filter_group_types?search_views=8`, { headers: stHeaders() })
    if (!r.ok) return DATE_FILTER_FALLBACK
    const types = await r.json()
    const arr: Record<string, unknown>[] = Array.isArray(types) ? types : []
    const match = arr.find(
      t => Number(t.filterType) === 2 && !t.deprecated &&
      (String(t.name ?? '').toLowerCase().includes('date') ||
       String(t.simpleName ?? '').toLowerCase().includes('date'))
    )
    return match ? Number(match.filterGroupType) : DATE_FILTER_FALLBACK
  } catch {
    return DATE_FILTER_FALLBACK
  }
}

// Per the Streamtime API docs, filterGroups must be nested inside filterGroupCollections —
// having filterGroups at the top level alongside filterGroupCollections is not valid.
function buildFilterBody(dateFrom: string, dateTo: string, filterTypeId: number, offset: number) {
  return {
    maxResults: BATCH,
    offset,
    filterGroupCollection: {
      conditionMatchTypeId: 1,
      filterGroupCollections: [
        {
          conditionMatchTypeId: 1,
          filterGroups: [
            {
              filterGroupTypeId: filterTypeId,
              conditionMatchTypeId: 1,
              filters: [
                { valueMatchTypeId: 38, value: dateFrom },
                { valueMatchTypeId: 39, value: dateTo },
              ],
            },
          ],
        },
      ],
    },
  }
}

function normalizeEntry(e: Record<string, unknown>): NormalizedEntry {
  const job     = (e.job ?? {}) as Record<string, unknown>
  const company = (job.company ?? {}) as Record<string, unknown>
  const status  = (e.loggedTimeStatus ?? {}) as Record<string, unknown>

  // LoggedTime.jobLabels are plain strings per the API docs
  // Job.jobLabels are JobLabel objects with a .name property
  const entryLabelName = Array.isArray(e.jobLabels)
    ? (e.jobLabels as unknown[]).find((l): l is string => typeof l === 'string')
    : undefined
  const jobLabelName = Array.isArray(job.jobLabels)
    ? (job.jobLabels as Record<string, unknown>[]).find(l => typeof l?.name === 'string')?.name
    : undefined
  const labelName = entryLabelName
    ?? jobLabelName
    ?? (job.isBillable === true ? 'Billable' : job.isBillable === false ? 'Non-Billable' : '—')

  return {
    id:           String(e.id ?? ''),
    userId:       Number(e.userId ?? 0),
    date:         String(e.date ?? '').slice(0, 10),
    minutes:      Number(e.minutes ?? 0),
    jobId:        String(job.id ?? ''),
    jobNumber:    String(job.number ?? '—'),
    jobName:      String(job.name ?? '—'),
    jobIsBillable: typeof job.isBillable === 'boolean' ? job.isBillable : null,
    jobLabelName: String(labelName),
    itemName:     String(e.itemName ?? '—'),
    clientName:   String(company.name ?? '—'),
    notes:        String(e.notes ?? ''),
    statusName:   String(status.name ?? '—'),
    cost:         Number(e.cost ?? 0),
    totalExTax:   Number(e.totalExTax ?? 0),
  }
}

export async function POST(req: Request) {
  try {
    await requireToolAccess('streamtime-reviewer')

    if (!process.env.STREAMTIME_API_TOKEN) {
      return Response.json({ error: 'STREAMTIME_API_TOKEN is not configured' }, { status: 500 })
    }

    const body = BodySchema.safeParse(await req.json())
    if (!body.success) return Response.json({ error: 'Invalid date range' }, { status: 400 })
    const { dateFrom, dateTo } = body.data

    const filterTypeId = await fetchDateFilterTypeId()
    const all: NormalizedEntry[] = []
    let offset = 0

    while (true) {
      const r = await fetch(`${ST_BASE}/search?search_view=8&include_statistics=false`, {
        method: 'POST',
        headers: stHeaders(),
        body: JSON.stringify(buildFilterBody(dateFrom, dateTo, filterTypeId, offset)),
      })
      if (!r.ok) {
        const errBody = await r.text().catch(() => '')
        throw new Error(`Streamtime /search ${r.status}: ${errBody}`)
      }
      const data = await r.json()
      const raw  = data.searchResults ?? {}
      const results: Record<string, unknown>[] = Array.isArray(raw) ? raw : Object.values(raw)
      all.push(...results.map(normalizeEntry))
      if (results.length < BATCH) break
      offset += BATCH
      if (offset >= 10000) break
    }

    return Response.json({ entries: all })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    const status = msg === 'Unauthorized' ? 401 : msg.startsWith('No access') ? 403 : 500
    return Response.json({ error: msg }, { status })
  }
}
