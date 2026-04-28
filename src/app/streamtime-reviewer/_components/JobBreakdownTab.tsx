'use client'

import { useMemo, useState } from 'react'
import { useReport } from './ReportContext'

const PAGE_SIZE = 50

export default function JobBreakdownTab() {
  const { jobBreakdown, entries } = useReport()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'All' | 'Billable' | 'Non-Billable'>('All')
  const [page,   setPage]   = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return jobBreakdown.filter(j => {
      if (filter === 'Billable'     && j.jobIsBillable !== true)  return false
      if (filter === 'Non-Billable' && j.jobIsBillable !== false) return false
      if (!q) return true
      return (
        j.jobName.toLowerCase().includes(q) ||
        j.jobNumber.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q)
      )
    })
  }, [jobBreakdown, filter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from       = Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)
  const to         = Math.min(page * PAGE_SIZE, filtered.length)

  const viewTotalBill = filtered.reduce((s, j) => s + j.billableHours, 0)
  const viewTotalNB   = filtered.reduce((s, j) => s + j.nonBillableHours, 0)
  const viewTotal     = viewTotalBill + viewTotalNB

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
          placeholder="Search job name, number or client…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          aria-label="Search jobs"
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
              <th className="sr-th">CLIENT</th>
              <th className="sr-th">LABEL</th>
              <th className="sr-th sr-th--right">TOTAL HRS</th>
              <th className="sr-th sr-th--right">BILLABLE HRS</th>
              <th className="sr-th sr-th--right">NON-BILL HRS</th>
              <th className="sr-th sr-th--right">COST (AUD)</th>
              <th className="sr-th sr-th--right">SELL (AUD)</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(j => (
              <tr key={j.jobId} className="sr-tr">
                <td className="sr-td sr-td--id">{j.jobNumber}</td>
                <td className="sr-td sr-td--name sr-td--truncate" title={j.jobName}>{j.jobName}</td>
                <td className="sr-td">{j.clientName}</td>
                <td className="sr-td">
                  <span className={`sr-label-badge ${j.jobIsBillable === true ? 'sr-label-badge--bill' : j.jobIsBillable === false ? 'sr-label-badge--nonbill' : 'sr-label-badge--unknown'}`}>
                    {j.jobIsBillable === true ? 'Billable' : j.jobIsBillable === false ? 'Non-Billable' : '—'}
                  </span>
                </td>
                <td className="sr-td sr-td--mono sr-td--right">{j.totalHours.toFixed(2)}</td>
                <td className="sr-td sr-td--mono sr-td--right sr-td--green">{j.billableHours.toFixed(2)}</td>
                <td className="sr-td sr-td--mono sr-td--right sr-td--warn">{j.nonBillableHours.toFixed(2)}</td>
                <td className="sr-td sr-td--mono sr-td--right sr-td--muted">${Math.round(j.cost)}</td>
                <td className="sr-td sr-td--mono sr-td--right sr-td--muted">${Math.round(j.sell)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="sr-totals-row">
              <td className="sr-td" colSpan={4}>TOTAL</td>
              <td className="sr-td sr-td--mono sr-td--right">{viewTotal.toFixed(2)}</td>
              <td className="sr-td sr-td--mono sr-td--right sr-td--green">{viewTotalBill.toFixed(2)}</td>
              <td className="sr-td sr-td--mono sr-td--right sr-td--warn">{viewTotalNB.toFixed(2)}</td>
              <td className="sr-td" colSpan={2} />
            </tr>
          </tfoot>
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
