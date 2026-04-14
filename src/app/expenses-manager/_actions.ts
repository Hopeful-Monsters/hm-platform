'use server'

import { createClient } from '@/lib/supabase/server'
import { rateLimits } from '@/lib/upstash/ratelimit'

// ── Auth ─────────────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
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

const ST_SEARCH    = 'https://api.streamtime.net/v1/search'
const ST_COMPANIES = 'https://api.streamtime.net/v1/companies'
const ST_EXPENSES  = 'https://api.streamtime.net/v1/logged_expenses'

function stKey(): string {
  const key = process.env.STREAMTIME_KEY
  if (!key) throw new Error('STREAMTIME_KEY not configured')
  return key
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Fetch the job list from Streamtime (search view 7).
 * Replaces POST /api/expenses-manager/jobs
 */
export async function searchJobs(): Promise<{ searchResults: Array<Record<string, unknown>> }> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:jobs:${user.id}`)

  const res = await fetch(`${ST_SEARCH}?search_view=7&include_statistics=false`, {
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
  return res.json()
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
    const res = await fetch(`${ST_SEARCH}?search_view=12&include_statistics=false`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wildcardSearch: '', offset, maxResults: PAGE_SIZE,
        filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
      }),
    })
    if (!res.ok) break

    const data = await res.json() as { searchResults?: Array<Record<string, unknown>> }
    const page = (data.searchResults || []).map(r => ({
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

  const res = await fetch(`${ST_SEARCH}?search_view=12&include_statistics=false`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wildcardSearch: query, offset: 0, maxResults: 10,
      filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
    }),
  })
  if (!res.ok) throw new Error(`Streamtime error ${res.status}`)

  const data = await res.json() as {
    searchResults?: Array<Record<string, unknown>>
    results?: Array<Record<string, unknown>>
  }
  const results = (data.searchResults || data.results || []).map(r => ({
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

/**
 * Check whether the current user has a stored Drive refresh token.
 */
export async function getDriveStatus(): Promise<'connected' | 'disconnected'> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'disconnected'
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  return meta.drive_refresh_token ? 'connected' : 'disconnected'
}

/**
 * Remove the stored Drive refresh token, effectively disconnecting Drive.
 */
export async function disconnectDrive(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.auth.updateUser({ data: { drive_refresh_token: null } })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an expense to Streamtime.
 * Replaces POST /api/expenses-manager/expenses
 */
export async function submitExpense(loggedExpense: {
  jobId: number
  date: string
  company: string
  itemName: string
  costRate: number
  sellRate: number
  quantity: number
  itemPricingMethodId: number
  loggedExpenseStatusId: number
  currencyCode: string
  exchangeRate: number
  description: string
  markup: number
  reference?: string
}): Promise<Record<string, unknown>> {
  const user = await requireUser()
  await checkRateLimit(rateLimits.api, `expenses-manager:submit:${user.id}`)

  const res = await fetch(ST_EXPENSES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loggedExpense }),
  })

  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      `Streamtime ${res.status}: ${String(data.message ?? JSON.stringify(data)).slice(0, 200)}`
    )
  }
  return data
}
