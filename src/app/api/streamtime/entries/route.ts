import { z } from 'zod'
import { ST_BASE, stHeaders } from '@/lib/streamtime/client'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { HttpError } from '@/lib/api/errors'
import type { NormalizedEntry } from '@/app/streamtime-reviewer/_components/types'

const BATCH = 1000

const BodySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// filterGroupType 5 is the date field for search_view=8 (logged time) per the Streamtime v2 API.
const DATE_FILTER_TYPE_ID = 5

async function fetchDateFilterTypeId(): Promise<number> {
  try {
    const r = await fetch(`${ST_BASE}/filter_group_types?search_views=8`, { headers: stHeaders() })
    if (!r.ok) return DATE_FILTER_TYPE_ID
    const types = await r.json()
    const arr: Record<string, unknown>[] = Array.isArray(types) ? types : []
    const match = arr.find(
      t => Number(t.filterType) === 2 && !t.deprecated &&
      (String(t.name ?? '').toLowerCase().includes('date') ||
       String(t.simpleName ?? '').toLowerCase().includes('date'))
    )
    return match ? Number(match.filterGroupType) : DATE_FILTER_TYPE_ID
  } catch {
    return DATE_FILTER_TYPE_ID
  }
}

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

// Fetch unique jobs by ID in parallel — v2 does not embed job data in search results.
async function fetchJobMap(jobIds: number[]): Promise<Map<number, Record<string, unknown>>> {
  const map = new Map<number, Record<string, unknown>>()
  if (jobIds.length === 0) return map
  const results = await Promise.allSettled(
    jobIds.map(id =>
      fetch(`${ST_BASE}/jobs/${id}`, { headers: stHeaders() })
        .then(r => (r.ok ? r.json() : null))
    )
  )
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value) {
      map.set(jobIds[i], r.value as Record<string, unknown>)
    }
  }
  return map
}

// Fetch all companies via search_view=12 — no bulk-by-ID endpoint exists in v2.
async function fetchCompanyMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  let offset = 0
  while (true) {
    try {
      const r = await fetch(`${ST_BASE}/search?search_view=12`, {
        method: 'POST',
        headers: stHeaders(),
        body: JSON.stringify({
          maxResults: BATCH,
          offset,
          filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [] },
        }),
      })
      if (!r.ok) break
      const data: unknown = await r.json()
      const rows: Record<string, unknown>[] = Array.isArray(data) ? data : []
      for (const row of rows) {
        const c = (row.company ?? {}) as Record<string, unknown>
        const id = Number(c.id)
        if (id > 0 && typeof c.name === 'string') map.set(id, c.name)
      }
      if (rows.length < BATCH) break
      offset += BATCH
      if (offset >= 50000) break
    } catch {
      break
    }
  }
  return map
}

// Reject empty/whitespace strings and non-string types; return undefined to continue fallback chain.
const pickStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined

// v2 search wraps logged time data under a `loggedTime` sub-object; job/company are fetched separately.
function normalizeEntry(
  e: Record<string, unknown>,
  jobMap: Map<number, Record<string, unknown>>,
  companyMap: Map<number, string>,
): NormalizedEntry {
  const lt        = (e.loggedTime ?? {}) as Record<string, unknown>
  const status    = (lt.loggedTimeStatus ?? {}) as Record<string, unknown>
  const jobId     = Number(lt.jobId ?? 0)
  const job       = jobMap.get(jobId) ?? {}
  const companyId = Number(job.companyId ?? 0)

  // jobLabels at the search-result level are plain strings in v2
  const jobLabelNames = Array.isArray(e.jobLabels)
    ? (e.jobLabels as unknown[]).filter((l): l is string => typeof l === 'string')
    : []
  const labelName = jobLabelNames[0]
    ?? (job.isBillable === true ? 'Billable' : job.isBillable === false ? 'Non-Billable' : '—')

  return {
    id:            String(lt.id ?? ''),
    userId:        Number(lt.userId ?? 0),
    date:          String(lt.date ?? '').slice(0, 10),
    minutes:       Number(lt.minutes ?? 0),
    jobId:         String(jobId || ''),
    jobNumber:     String(job.number ?? '—'),
    jobName:       String(job.name ?? '—'),
    jobIsBillable: typeof job.isBillable === 'boolean' ? job.isBillable : null,
    jobLabelName:  String(labelName),
    // LoggedTimeSearchResult wrapper exposes the loggable item as `jobItem` at the top level.
    itemName:
      pickStr((e.jobItem as Record<string, unknown> | undefined)?.name) ??
      '—',
    clientName:    companyMap.get(companyId) ?? '—',
    notes:         String(lt.notes ?? ''),
    statusName:    String(status.name ?? '—'),
    cost:          Number(lt.totalCostExTax ?? 0),
    totalExTax:    Number(lt.totalExTax ?? 0),
  }
}

export const POST = createApiRoute({
  auth:   { tool: 'streamtime-reviewer' },
  schema: BodySchema,
  handler: async ({ body }) => {
    if (!process.env.STREAMTIME_KEY) {
      throw new HttpError(500, 'STREAMTIME_KEY is not configured')
    }
    const { dateFrom, dateTo } = body

    const filterTypeId = await fetchDateFilterTypeId()
    const rawEntries: Record<string, unknown>[] = []
    let offset = 0

    while (true) {
      const r = await fetch(`${ST_BASE}/search?search_view=8&include_statistics=false&additional_data=jobItem`, {
        method: 'POST',
        headers: stHeaders(),
        body: JSON.stringify(buildFilterBody(dateFrom, dateTo, filterTypeId, offset)),
      })
      if (!r.ok) {
        const errBody = await r.text().catch(() => '')
        throw new Error(`Streamtime /search ${r.status}: ${errBody}`)
      }
      const data = await r.json()
      // v2 search returns a top-level array, not { searchResults: [...] }
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : []
      rawEntries.push(...results)
      if (results.length < BATCH) break
      offset += BATCH
      if (offset >= 10000) break
    }

    // Drop entries that are scheduled-only (not yet logged). v2 marks these
    // via loggedTime.isScheduled = true OR loggedTimeStatus.name = 'Scheduled'.
    const loggedOnly = rawEntries.filter(e => {
      const lt = (e.loggedTime ?? {}) as Record<string, unknown>
      const status = (lt.loggedTimeStatus ?? {}) as Record<string, unknown>
      if (lt.isScheduled === true) return false
      if (typeof status.name === 'string' && status.name.toLowerCase() === 'scheduled') return false
      return true
    })

    // Enrich entries with job and company data — v2 does not embed these in search results.
    const jobIds = [...new Set(
      loggedOnly
        .map(e => Number((e.loggedTime as Record<string, unknown>)?.jobId ?? 0))
        .filter(id => id > 0)
    )]

    const [jobMap, companyMap] = await Promise.all([
      fetchJobMap(jobIds),
      fetchCompanyMap(),
    ])

    const entries = loggedOnly.map(e => normalizeEntry(e, jobMap, companyMap))

    return Response.json({ entries })
  },
})
