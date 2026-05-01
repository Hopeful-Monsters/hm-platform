// src/app/paid-our-worth/_lib/aggregateJobs.ts
//
// Pure aggregation helpers. No IO.

import type { NormalizedEntry } from '@/app/streamtime-reviewer/_components/types'

export interface JobTotal {
  /** Human-facing Streamtime job number (matches revenue CSV "Job No"). */
  jobNumber:   string
  jobName:     string
  isBillable:  boolean | null
  currentTime: number   // sum of totalExTax across entries
}

/**
 * Group normalised time entries by `jobNumber` and sum `totalExTax`.
 * Entries without a usable jobNumber (empty or "—") are dropped — the
 * revenue list and the non-billable display both key on the human-facing
 * Streamtime job number, never the internal record id.
 */
export function aggregateJobs(entries: NormalizedEntry[]): JobTotal[] {
  const map = new Map<string, JobTotal>()
  for (const e of entries) {
    const key = (e.jobNumber || '').trim()
    if (!key || key === '—') continue
    const existing = map.get(key)
    if (existing) {
      existing.currentTime += Number(e.totalExTax) || 0
      if (existing.isBillable === null && e.jobIsBillable !== null) existing.isBillable = e.jobIsBillable
      if ((!existing.jobName || existing.jobName === '—') && e.jobName) existing.jobName = e.jobName
    } else {
      map.set(key, {
        jobNumber:   key,
        jobName:     e.jobName || '—',
        isBillable:  e.jobIsBillable,
        currentTime: Number(e.totalExTax) || 0,
      })
    }
  }
  return [...map.values()]
}

export function sumCurrentTime(rows: JobTotal[]): number {
  return rows.reduce((s, r) => s + r.currentTime, 0)
}
