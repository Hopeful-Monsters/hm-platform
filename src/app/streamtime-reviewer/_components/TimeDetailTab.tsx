'use client'

import { useMemo, useState } from 'react'
import { useReport } from './ReportContext'

const PAGE_SIZE = 50

export default function TimeDetailTab() {
  const { entries, users } = useReport()
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'All' | 'Billable' | 'Non-Billable'>('All')
  const [page,    setPage]    = useState(1)

  const userMap = useMemo(
    () => new Map(users.map(u => [u.id, u.fullName])),
    [users]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries.filter(e => {
      if (filter === 'Billable'     && e.jobIsBillable !== true)  return false
      if (filter === 'Non-Billable' && e.jobIsBillable !== false) return false
      if (!q) return true
      return (
        (userMap.get(e.userId) ?? '').toLowerCase().includes(q) ||
        e.jobName.toLowerCase().includes(q) ||
        e.jobNumber.toLowerCase().includes(q) ||
        e.clientName.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.itemName.toLowerCase().includes(q)
      )
    })
  }, [entries, filter, search, userMap])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from       = Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)
  const to         = Math.min(page * PAGE_SIZE, filtered.length)

  function handleFilter(f: typeof filter) { setFilter(f); setPage(1) }
  function handleSearch(v: string)        { setSearch(v); setPage(1) }

  if (!entries.length) {
    return <div className="sr-empty"><p>Set a date range and run the report.</p></div>
  }

  return (
    <div className="sr-tab-panel">
      <div className="sr-controls">
        <input
          className="sr-search"
          placeholder="Search team member, job, client, description…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          aria-label="Search time entries"
        />
        <div className="sr-chips">
          {(['All', 'Billable', 'Non-Billable'] as const).map(f => (
            <button
              key={f}
              className={`sr-chip ${filter === f ? 'is-active' : ''} sr-chip--${f.toLowerCase().replace('-', '')}`}
              onClick={() => handleFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th className="sr-th">JOB #</th>
              <th className="sr-th">JOB NAME</th>
              <th className="sr-th">LABEL</th>
              <th className="sr-th">ITEM</th>
              <th className="sr-th">CLIENT</th>
              <th className="sr-th">TEAM MEMBER</th>
              <th className="sr-th">DESCRIPTION</th>
              <th className="sr-th">DATE</th>
              <th className="sr-th sr-th--right">HRS</th>
              <th className="sr-th">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(e => (
              <tr key={e.id} className="sr-tr">
                <td className="sr-td sr-td--id">{e.jobNumber}</td>
                <td className="sr-td sr-td--name sr-td--truncate" title={e.jobName}>{e.jobName}</td>
                <td className="sr-td">
                  <span className={`sr-label-badge ${e.jobIsBillable === true ? 'sr-label-badge--bill' : 'sr-label-badge--nonbill'}`}>
                    {e.jobLabelName}
                  </span>
                </td>
                <td className="sr-td">{e.itemName}</td>
                <td className="sr-td">{e.clientName}</td>
                <td className="sr-td sr-td--name sr-td--sm">
                  {userMap.get(e.userId) ?? String(e.userId)}
                </td>
                <td className="sr-td sr-td--truncate sr-td--muted" title={e.notes}>{e.notes || '—'}</td>
                <td className="sr-td sr-td--mono">{e.date}</td>
                <td className="sr-td sr-td--mono sr-td--right">{(e.minutes / 60).toFixed(2)}</td>
                <td className="sr-td">
                  <span className="sr-status-badge">{e.statusName}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="sr-pagination">
            <span>{from}–{to} of {filtered.length}</span>
            <div className="sr-page-btns">
              <button className="sr-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
              <button className="sr-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
