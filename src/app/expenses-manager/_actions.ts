'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireToolAccess } from '@/lib/auth'
import { rateLimits } from '@/lib/upstash/ratelimit'

// ── Auth helper ───────────────────────────────────────────────────────────────
// Wraps requireToolAccess for server actions (which throw, not return Responses).

async function requireUser() {
  return requireToolAccess('expenses-manager')
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Adapted from applyRateLimit — throws instead of returning a Response,
// since Server Actions can't return Response objects.

async function checkRateLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean }> },
  key: string,
) {
  const { success } = await limiter.limit(key)
  if (!success) throw new Error('Too many requests. Please try again shortly.')
}

// ── Streamtime config ─────────────────────────────────────────────────────────

const ST_SEARCH    = 'https://api.streamtime.net/v2/search'
const ST_COMPANIES = 'https://api.streamtime.net/v2/companies'
const ST_EXPENSES  = 'https://api.streamtime.net/v2/logged_expenses'

function stKey(): string {
  const key = process.env.STREAMTIME_KEY
  if (!key) throw new Error('STREAMTIME_KEY not configured')
  return key
}

// ── Search response normalisation ────────────────────────────────────────────
// v1 returned { searchResults: [...] } — flat objects per record.
// v2 returns a top-level array of wrapper objects where the record sits under
// a typed key: [{ job: {...}, company: null, ... }, ...]
// This helper extracts the inner record so all downstream mapping stays the same.

function parseSearchResults(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return (raw as Array<Record<string, unknown>>).map(wrapper => {
      // Pick the first non-null object value as the inner record.
      // Covers job (view 7), company (view 12), and any future view.
      const inner = Object.values(wrapper).find(
        v => v !== null && typeof v === 'object' && !Array.isArray(v),
      )
      return (inner as Record<string, unknown>) ?? wrapper
    })
  }
  // Fallback: legacy { searchResults: [...] } shape
  const obj = raw as Record<string, unknown>
  return (obj.searchResults as Array<Record<string, unknown>>) ?? []
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Fetch the job list from Streamtime (search view 7).
 * Replaces POST /api/expenses-manager/jobs
 */
export async function searchJobs(): Promise<{ searchResults: Array<Record<string, unknown>> }> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:jobs:${user.id}`)

  const res = await fetch(`${ST_SEARCH}?search_view=7`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wildcardSearch: '', offset: 0, maxResults: 500,
      filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [] },
    }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(d.error || `Streamtime error ${res.status}`)
  }
  return { searchResults: parseSearchResults(await res.json()) }
}

/**
 * Paginate all companies from Streamtime (search view 12).
 * Replaces GET /api/expenses-manager/companies/all
 */
export async function getAllCompanies(): Promise<{ companies: Array<{ id: unknown; name: unknown }> }> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:companies-all:${user.id}`)

  const PAGE_SIZE   = 200
  const MAX_RESULTS = 2000
  let offset = 0
  let allResults: Array<{ id: unknown; name: unknown }> = []

  while (allResults.length < MAX_RESULTS) {
    const res = await fetch(`${ST_SEARCH}?search_view=12`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wildcardSearch: '', offset, maxResults: PAGE_SIZE,
        filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
      }),
    })
    if (!res.ok) break

    const page = parseSearchResults(await res.json()).map(r => ({
      id:   r['id']   ?? r['companyId'],
      name: r['name'] ?? r['companyName'] ?? r['Company Name'],
    })).filter(r => r.id && r.name)

    allResults = allResults.concat(page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return { companies: allResults }
}

/**
 * Search companies by name in Streamtime (search view 12).
 * Replaces POST /api/expenses-manager/companies/search
 */
export async function searchCompanies(query: string): Promise<{ results: Array<{ id: unknown; name: unknown }> }> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:companies-search:${user.id}`)

  const res = await fetch(`${ST_SEARCH}?search_view=12`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wildcardSearch: query, offset: 0, maxResults: 10,
      filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
    }),
  })
  if (!res.ok) throw new Error(`Streamtime error ${res.status}`)

  const results = parseSearchResults(await res.json()).map(r => ({
    id:   r['id']   ?? r['companyId']   ?? r['Company ID'],
    name: r['name'] ?? r['companyName'] ?? r['Company Name'] ?? r['Name'],
  })).filter(r => r.id && r.name)

  return { results }
}

/**
 * Create a new company in Streamtime.
 * Replaces POST /api/expenses-manager/companies/create
 */
export async function createCompanyAction(name: string): Promise<{ id: unknown; name: string }> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:companies-create:${user.id}`)

  if (!name?.trim()) throw new Error('name is required')

  const res = await fetch(ST_COMPANIES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      companyStatus: { id: 1 },
      taxNumber: null, phone1: null, phone2: null, websiteAddress: null,
    }),
  })

  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(data.message ?? data.error ?? `Streamtime ${res.status}`))
  }
  return { id: data.id, name: String(data.name ?? name) }
}

// ── Drive ─────────────────────────────────────────────────────────────────────
// Refresh tokens are stored in the drive_tokens table (service role only).
// They are never written to user_metadata or included in the Supabase JWT.

/**
 * Check whether the current user has a stored Drive refresh token.
 * Reads from drive_tokens (service role) — token is never in user_metadata / JWT.
 */
export async function getDriveStatus(): Promise<'connected' | 'disconnected'> {
  // requireToolAccess ensures user is authenticated, approved, and has tool access.
  // Gracefully returns 'disconnected' on any auth failure rather than throwing.
  const user = await requireToolAccess('expenses-manager').catch(() => null)
  if (!user) return 'disconnected'

  const { data } = await createServiceClient()
    .from('drive_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? 'connected' : 'disconnected'
}

/**
 * Remove the stored Drive refresh token, effectively disconnecting Drive.
 */
export async function disconnectDrive(): Promise<void> {
  const user = await requireToolAccess('expenses-manager').catch(() => null)
  if (!user) return

  await createServiceClient()
    .from('drive_tokens')
    .delete()
    .eq('user_id', user.id)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an expense to Streamtime.
 * Replaces POST /api/expenses-manager/expenses
 */
export async function submitExpense(loggedExpense: {
  jobId: number
  date: string
  supplierCompanyId: number
  itemName: string
  costRate: number
  sellRate: number
  quantity: number
  itemPricingMethodId: number
  loggedExpenseStatusId: number
  currencyCode: string
  exchangeRate: number
  markup: number
  reference?: string
}): Promise<Record<string, unknown>> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:submit:${user.id}`)

  const res = await fetch(ST_EXPENSES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loggedExpense: { ...loggedExpense, supplierContactId: null } }),
  })

  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      `Streamtime ${res.status}: ${String(data.message ?? JSON.stringify(data)).slice(0, 200)}`
    )
  }
  return data
}
