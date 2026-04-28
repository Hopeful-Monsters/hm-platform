'use client'

import { useMemo } from 'react'
import { useReport } from './ReportContext'
import type { UserSummaryRow } from './types'

function fmt2(n: number) { return n.toFixed(2) }
function fmtPct(n: number) { return (n * 100).toFixed(1) + '%' }
function diffClass(d: number | null) {
  if (d === null) return 'sr-diff--neutral'
  if (d >= 0) return 'sr-diff--pos'
  return 'sr-diff--neg'
}

function capBarClass(totalHours: number, capacityHours: number) {
  if (capacityHours <= 0) return ''
  const ratio = totalHours / capacityHours
  if (ratio < 1)    return 'sr-cap-bar-fill--under'
  if (ratio <= 1.1) return 'sr-cap-bar-fill--ok'
  return 'sr-cap-bar-fill--over'
}

function billPctClass(pct: number) {
  if (pct >= 0.7) return 'sr-bill--good'
  if (pct >= 0.5) return 'sr-bill--ok'
  return 'sr-bill--low'
}

function TotalsRow({ rows, label }: { rows: UserSummaryRow[]; label: string }) {
  const totalBill    = rows.reduce((s, r) => s + r.billableHours, 0)
  const totalNB      = rows.reduce((s, r) => s + r.nonBillableHours, 0)
  const totalOoo     = rows.reduce((s, r) => s + r.oooHours, 0)
  const totalTotal   = rows.reduce((s, r) => s + r.totalHours, 0)
  const totalWorking = rows.reduce((s, r) => s + r.workingHours, 0)
  const totalCap     = rows.reduce((s, r) => s + r.capacityHours, 0)
  const avgBillPct   = totalWorking > 0 ? totalBill / totalWorking : 0
  const avgTarget    = rows.filter(r => r.targetPct !== null)
  const avgTargetVal = avgTarget.length > 0
    ? avgTarget.reduce((s, r) => s + r.targetPct!, 0) / avgTarget.length
    : null
  const avgDiff = avgTargetVal !== null ? avgBillPct * 100 - avgTargetVal : null

  return (
    <tr className="sr-totals-row">
      <td className="sr-td sr-td--name" colSpan={2}>{label}</td>
      <td className="sr-td sr-td--mono sr-td--right">{totalCap > 0 ? fmt2(totalCap) : '—'}</td>
      <td className="sr-td sr-td--mono sr-td--right">{fmt2(totalBill)}</td>
      <td className="sr-td sr-td--mono sr-td--right">{fmt2(totalNB)}</td>
      <td className="sr-td sr-td--mono sr-td--right">{fmt2(totalOoo)}</td>
      <td className="sr-td sr-td--mono sr-td--right">{fmt2(totalTotal)}</td>
      <td className="sr-td sr-td--mono sr-td--right">{fmt2(totalWorking)}</td>
      <td className="sr-td sr-td--mono sr-td--right">
        <span className={billPctClass(avgBillPct)}>{fmtPct(avgBillPct)}</span>
      </td>
      <td className="sr-td sr-td--mono sr-td--right">
        {avgTargetVal !== null ? avgTargetVal.toFixed(1) + '%' : '—'}
      </td>
      <td className={`sr-td sr-td--mono sr-td--right ${diffClass(avgDiff)}`}>
        {avgDiff !== null ? (avgDiff >= 0 ? '+' : '') + avgDiff.toFixed(1) + '%' : '—'}
      </td>
    </tr>
  )
}

export default function SummaryTab() {
  const { summaryRows, excludeLeadership, toggleExcludeLeadership, entries } = useReport()

  const visibleRows = useMemo(
    () => excludeLeadership ? summaryRows.filter(r => !r.isLeadership) : summaryRows,
    [summaryRows, excludeLeadership]
  )

  const nonLeadershipRows = useMemo(
    () => summaryRows.filter(r => !r.isLeadership),
    [summaryRows]
  )

  const totalBill    = summaryRows.reduce((s, r) => s + r.billableHours, 0)
  const totalNB      = summaryRows.reduce((s, r) => s + r.nonBillableHours, 0)
  const totalOoo     = summaryRows.reduce((s, r) => s + r.oooHours, 0)
  const totalHrs     = summaryRows.reduce((s, r) => s + r.totalHours, 0)
  const totalWorking = summaryRows.reduce((s, r) => s + r.workingHours, 0)
  const avgBill      = totalWorking > 0 ? totalBill / totalWorking : 0
  const totalCap     = summaryRows.reduce((s, r) => s + r.capacityHours, 0)

  const hasLeadership = summaryRows.some(r => r.isLeadership)

  if (!entries.length) {
    return (
      <div className="sr-empty">
        <p>Set a date range and run the report.</p>
      </div>
    )
  }

  return (
    <div className="sr-tab-panel">
      {/* Stats strip */}
      <div className="sr-stats-strip">
        <div className="sr-stat">
          <div className="sr-stat-label">Total Hours</div>
          <div className="sr-stat-value">{fmt2(totalHrs)}</div>
          <div className="sr-stat-sub">{summaryRows.length} team members</div>
        </div>
        <div className="sr-stat">
          <div className="sr-stat-label">Billable Hours</div>
          <div className="sr-stat-value sr-stat-value--accent">{fmt2(totalBill)}</div>
          <div className="sr-stat-sub">{fmtPct(avgBill)} avg billable rate</div>
        </div>
        <div className="sr-stat">
          <div className="sr-stat-label">Non-Billable</div>
          <div className="sr-stat-value sr-stat-value--warn">{fmt2(totalNB)}</div>
          <div className="sr-stat-sub">excl. out of office</div>
        </div>
        <div className="sr-stat">
          <div className="sr-stat-label">Out of Office</div>
          <div className="sr-stat-value">{fmt2(totalOoo)}</div>
          <div className="sr-stat-sub">excluded from working hrs</div>
        </div>
        <div className="sr-stat">
          <div className="sr-stat-label">Team Capacity</div>
          <div className="sr-stat-value">{totalCap > 0 ? fmt2(totalCap) : '—'}</div>
          <div className="sr-stat-sub">
            {totalCap > 0 ? Math.round(totalHrs / totalCap * 100) + '% utilisation' : 'No schedule data'}
          </div>
        </div>
      </div>

      {/* Table controls */}
      <div className="sr-table-controls">
        {hasLeadership && (
          <button
            className={`sr-toggle-btn ${excludeLeadership ? 'is-active' : ''}`}
            onClick={toggleExcludeLeadership}
          >
            {excludeLeadership ? 'Show Leadership' : 'Exclude Leadership'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th className="sr-th">NAME</th>
              <th className="sr-th">TEAM</th>
              <th className="sr-th sr-th--right">CAPACITY</th>
              <th className="sr-th sr-th--right">BILLABLE HRS</th>
              <th className="sr-th sr-th--right">NON-BILL HRS</th>
              <th className="sr-th sr-th--right">OOO HRS</th>
              <th className="sr-th sr-th--right">TOTAL HRS</th>
              <th className="sr-th sr-th--right">WORKING HRS</th>
              <th className="sr-th sr-th--right">BILL %</th>
              <th className="sr-th sr-th--right">TARGET %</th>
              <th className="sr-th sr-th--right">DIFF</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(r => {
              const capPct = r.capacityHours > 0
                ? Math.min(100, Math.round(r.totalHours / r.capacityHours * 100))
                : 0
              return (
                <tr key={r.userId} className="sr-tr">
                  <td className="sr-td sr-td--name">
                    {r.fullName}
                    {r.isLeadership && <span className="sr-badge sr-badge--lead">L</span>}
                  </td>
                  <td className="sr-td">
                    <span className={`sr-team-badge sr-team-badge--${r.team.toLowerCase()}`}>
                      {r.team}
                    </span>
                  </td>
                  <td className="sr-td sr-td--mono sr-td--right">
                    <div className="sr-cap-cell">
                      <div className="sr-cap-bar">
                        <div className={`sr-cap-bar-fill ${capBarClass(r.totalHours, r.capacityHours)}`} style={{ width: `${capPct}%` }} />
                      </div>
                      <span>{r.capacityHours > 0 ? fmt2(r.capacityHours) : '—'}</span>
                    </div>
                  </td>
                  <td className="sr-td sr-td--mono sr-td--right">{fmt2(r.billableHours)}</td>
                  <td className="sr-td sr-td--mono sr-td--right">{fmt2(r.nonBillableHours)}</td>
                  <td className="sr-td sr-td--mono sr-td--right">{fmt2(r.oooHours)}</td>
                  <td className="sr-td sr-td--mono sr-td--right">{fmt2(r.totalHours)}</td>
                  <td className="sr-td sr-td--mono sr-td--right">{fmt2(r.workingHours)}</td>
                  <td className={`sr-td sr-td--mono sr-td--right ${billPctClass(r.billablePct)}`}>
                    {fmtPct(r.billablePct)}
                  </td>
                  <td className="sr-td sr-td--mono sr-td--right">
                    {r.targetPct !== null ? r.targetPct.toFixed(1) + '%' : '—'}
                  </td>
                  <td className={`sr-td sr-td--mono sr-td--right ${diffClass(r.diffPct)}`}>
                    {r.diffPct !== null
                      ? (r.diffPct >= 0 ? '+' : '') + r.diffPct.toFixed(1) + '%'
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <TotalsRow rows={summaryRows} label="Total / Avg (All)" />
            {hasLeadership && (
              <TotalsRow rows={nonLeadershipRows} label="Total / Avg (Excl. Leadership)" />
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}
