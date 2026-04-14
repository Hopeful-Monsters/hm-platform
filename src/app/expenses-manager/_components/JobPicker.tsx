'use client'

import { useState } from 'react'
import type { Job } from '../_types'
import { StepIndicator } from './ExpenseWizard'

// ── JobPicker ────────────────────────────────────────────────────
// Client component — receives SSR-fetched jobs from the server page,
// handles filter + calls onSelect when the user confirms a job.

export default function JobPicker({
  jobs,
  error,
  onSelect,
  onRetry,
}: {
  jobs: Job[]
  error: string | null
  onSelect: (job: Job) => void
  onRetry?: () => void
}) {
  const [filter, setFilter]       = useState('')
  const [selected, setSelected]   = useState<Job | null>(null)

  const filtered = filter
    ? jobs.filter(j => {
        const q = filter.toLowerCase()
        return (
          (j.name   || '').toLowerCase().includes(q) ||
          (j.num    || '').toLowerCase().includes(q) ||
          (j.client || '').toLowerCase().includes(q) ||
          (j.full   || '').toLowerCase().includes(q)
        )
      })
    : jobs

  function proceed() {
    if (!selected) return
    onSelect(selected)
  }

  return (
    <>
      <StepIndicator step={1} />
      <div className="card">
      <div className="card-hdr">
        <div className="card-title">Select a Job</div>
      </div>
      <div className="card-body">

        {error && (
          <div>
            <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>
            {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
          </div>
        )}

        {!error && jobs.length === 0 && (
          <div className="empty">
            <div className="empty-ico">⚠️</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Could not load jobs</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check that STREAMTIME_KEY is set</div>
            {onRetry && (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button>
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <div className="job-search-wrap">
              <span className="job-search-ico">🔍</span>
              <input
                type="text"
                id="jobSearch"
                className="fc"
                placeholder="Search by job name, number or client…"
                value={filter}
                onChange={e => { setFilter(e.target.value); setSelected(null) }}
              />
            </div>
            <div className="jobs-list">
              {filtered.length === 0
                ? <div className="empty"><div className="empty-ico">🔍</div>No matching jobs</div>
                : filtered.map(j => (
                    <div
                      key={j.id}
                      className={`job-item${selected?.id === j.id ? ' selected' : ''}`}
                      onClick={() => setSelected(j)}
                    >
                      <div>
                        <div className="job-name">{j.full || j.name}</div>
                        {j.client && <div className="job-meta">{j.client}</div>}
                      </div>
                      {j.num && <span className="job-badge">{j.num}</span>}
                    </div>
                  ))
              }
            </div>
          </>
        )}

        {selected && (
          <div className="step-ftr">
            <button className="btn btn-primary" onClick={proceed}>Continue →</button>
          </div>
        )}

      </div>
    </div>
    </>
  )
}
