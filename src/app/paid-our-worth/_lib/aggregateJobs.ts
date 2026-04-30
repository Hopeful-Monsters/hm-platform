// src/app/paid-our-worth/_lib/aggregateJobs.ts
//
// Pure aggregation helpers. No IO.

import type { NormalizedEntry } from '@/app/streamtime-reviewer/_components/types'

export interface JobTotal {
  jobId:       string
  jobName:     string
  isBillable:  boolean | null
  currentTime: number   // sum of totalExTax across entries
}

/**
 * Group normalised time entries by jobId and sum `totalExTax`.
 * `jobName` resolves to the most recent non-empty value seen.
 * `isBillable` resolves to the first non-null value seen.
 */
export function aggregateJobs(entries: NormalizedEntry[]): JobTotal[] {
  const map = new Map<string, JobTotal>()
  for (const e of entries) {
    if (!e.jobId) continue
    const existing = map.get(e.jobId)
    if (existing) {
      existing.currentTime += Number(e.totalExTax) || 0
      if (existing.isBillable === null && e.jobIsBillable !== null) existing.isBillable = e.jobIsBillable
      if ((!existing.jobName || existing.jobName === '—') && e.jobName) existing.jobName = e.jobName
    } else {
      map.set(e.jobId, {
        jobId:       e.jobId,
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
