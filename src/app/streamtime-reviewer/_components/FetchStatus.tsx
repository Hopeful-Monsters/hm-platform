'use client'

import { useReport } from './ReportContext'
import type { FetchState } from './types'

function Pill({ label, state, count }: { label: string; state: FetchState; count?: number }) {
  return (
    <div className={`sr-pill sr-pill--${state}`}>
      <span className={`sr-pill-dot ${state === 'loading' ? 'sr-pill-dot--pulse' : ''}`} />
      {label}
      {count !== undefined && state === 'done' && (
        <span className="sr-pill-count">{count}</span>
      )}
    </div>
  )
}

export default function FetchStatus() {
  const { fetchStatuses, users, entries } = useReport()

  if (Object.values(fetchStatuses).every(s => s === 'idle')) return null

  return (
    <div className="sr-fetch-status" role="status" aria-live="polite">
      <Pill label="Users"         state={fetchStatuses.users}    count={users.length} />
      <Pill label="Time Entries"  state={fetchStatuses.entries}  count={entries.length} />
      <Pill label="Settings"      state={fetchStatuses.settings} />
    </div>
  )
}
