/**
 * Streamtime v2 API client primitives — server-side only.
 *
 * Shared by expenses-manager server actions and the streamtime-reviewer
 * API routes. Higher-level helpers (search jobs, list companies, normalize
 * a logged-time entry, etc.) live in their respective callers; this file
 * stays scoped to the lowest common denominator: auth, base URL, the
 * fetch wrapper, and the v2 search-result normalisation quirk.
 */

import 'server-only'

export const ST_BASE = 'https://api.streamtime.net/v2'

/**
 * Read STREAMTIME_KEY from env, throwing a clear error if it's missing.
 * Call sites should let this propagate — there's no fallback that would
 * be safe to use.
 */
export function stKey(): string {
  const key = process.env.STREAMTIME_KEY
  if (!key) throw new Error('STREAMTIME_KEY is not configured')
  return key
}

/** Default headers for Streamtime v2 requests (Bearer auth + JSON). */
export function stHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${stKey()}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Normalise a v2 search response.
 *
 * v1 returned `{ searchResults: [...] }` of flat records.
 * v2 returns a top-level array of wrapper objects where the actual record
 * sits under a typed key, e.g. `[{ job: {...}, company: null, ... }, ...]`.
 * This helper returns the inner record for each row so downstream mapping
 * stays view-agnostic.
 */
export function parseSearchResults(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return (raw as Array<Record<string, unknown>>).map(wrapper => {
      const inner = Object.values(wrapper).find(
        v => v !== null && typeof v === 'object' && !Array.isArray(v),
      )
      return (inner as Record<string, unknown>) ?? wrapper
    })
  }
  const obj = raw as Record<string, unknown>
  return (obj.searchResults as Array<Record<string, unknown>>) ?? []
}
