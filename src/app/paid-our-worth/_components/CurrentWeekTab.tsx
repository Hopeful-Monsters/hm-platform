'use client'

import { useEffect, useMemo, useState } from 'react'
import { listRevenueByMonth } from '../_actions'
import { workingDaysInMonth, workingDaysToCutoff, firstOfMonth } from '../_lib/holidays'
import type { JobTotal } from '../_lib/aggregateJobs'
import type { RevenueEntry } from '../_types'

interface JobTotalsResponse {
  jobTotals:   JobTotal[]
  reportTotal: number
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function CurrentWeekTab() {
  const [cutoff, setCutoff]           = useState<string>(todayIso())
  const [revenue, setRevenue]         = useState<RevenueEntry[]>([])
  const [jobTotals, setJobTotals]     = useState<JobTotal[]>([])
  const [reportTotal, setReportTotal] = useState<number>(0)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const dateFrom = useMemo(() => firstOfMonth(cutoff), [cutoff])
  const periodMonth = useMemo(() => cutoff.slice(0, 7), [cutoff])

  const workingDaysMonth = useMemo(() => workingDaysInMonth(cutoff), [cutoff])
  const daysWorked       = useMemo(() => workingDaysToCutoff(cutoff), [cutoff])

  async function refetch() {
    setLoading(true)
    setError(null)
    try {
      const [{ entries }, totalsRes] = await Promise.all([
        listRevenueByMonth(periodMonth),
        fetch('/api/paid-our-worth/job-totals', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ dateFrom, dateTo: cutoff }),
        }).then(async r => {
          if (!r.ok) throw new Error(`Streamtime fetch failed (${r.status})`)
          return r.json() as Promise<JobTotalsResponse>
        }),
      ])
      setRevenue(entries)
      setJobTotals(totalsRes.jobTotals)
      setReportTotal(totalsRes.reportTotal)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutoff])

  const totalsByJob = useMemo(() => {
    const m = new Map<string, JobTotal>()
    for (const t of jobTotals) m.set(t.jobId, t)
    return m
  }, [jobTotals])

  const billableRows = useMemo(() => {
    return revenue.map(r => {
      const total = totalsByJob.get(r.jobId)
      const currentTime = total?.currentTime ?? 0
      return {
        jobId:       r.jobId,
        jobName:     r.jobName,
        currentTime,
        revenue:     r.revenueAmount,
        timeLeft:    r.revenueAmount - currentTime,
      }
    })
  }, [revenue, totalsByJob])

  const nonBillableRows = useMemo(() => {
    const list = jobTotals.filter(t => t.isBillable === false)
    const total = list.reduce((s, r) => s + r.currentTime, 0)
    return list
      .sort((a, b) => Number(a.jobId) - Number(b.jobId))
      .map(t => ({
        jobId:       t.jobId,
        jobName:     t.jobName,
        currentTime: t.currentTime,
        pctOfTotal:  total > 0 ? t.currentTime / total : 0,
      }))
  }, [jobTotals])

  const totalBillable    = billableRows.reduce((s, r) => s + r.currentTime, 0)
  const totalRevenue     = billableRows.reduce((s, r) => s + r.revenue, 0)
  const totalTimeLeft    = billableRows.reduce((s, r) => s + r.timeLeft, 0)
  const totalNonBillable = nonBillableRows.reduce((s, r) => s + r.currentTime, 0)
  const grandTotal       = totalBillable + totalNonBillable
  const variance         = grandTotal - reportTotal

  return (
    <div className="pow-current">
      <div className="pow-current-head">
        <label className="pow-field">
          <span className="pow-field-label">Time up to</span>
          <input
            type="date"
            value={cutoff}
            max={todayIso()}
            onChange={e => setCutoff(e.target.value)}
            className="pow-input"
          />
        </label>

        <div className="pow-current-stats">
          <div className="pow-stat">
            <span className="pow-stat-label">Working days in month</span>
            <span className="pow-stat-value">{workingDaysMonth}</span>
          </div>
          <div className="pow-stat">
            <span className="pow-stat-label">Days worked</span>
            <span className="pow-stat-value">{daysWorked}</span>
          </div>
          <div className="pow-stat">
            <span className="pow-stat-label">Time up to</span>
            <span className="pow-stat-value">{fmtDate(cutoff)}</span>
          </div>
        </div>

        <button
          type="button"
          className="pow-btn pow-btn--primary"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Fetching…' : 'Refetch Streamtime'}
        </button>
      </div>

      {error && <div className="pow-banner pow-banner--err" role="alert">{error}</div>}

      {revenue.length === 0 && !loading && (
        <div className="pow-banner pow-banner--err">
          No revenue entries for {periodMonth}. Upload a CSV in the Revenue Config tab.
        </div>
      )}

      <h3 className="pow-section-title">Billable</h3>
      <table className="pow-table">
        <thead>
          <tr>
            <th scope="col">Job No</th>
            <th scope="col">Job Name</th>
            <th scope="col" className="pow-num">Current Time ($)</th>
            <th scope="col" className="pow-num">Revenue ($)</th>
            <th scope="col" className="pow-num">Time Left</th>
          </tr>
        </thead>
        <tbody>
          {billableRows.map(r => (
            <tr key={r.jobId}>
              <td>{r.jobId}</td>
              <td>{r.jobName}</td>
              <td className="pow-num">{fmtCurrency(r.currentTime)}</td>
              <td className="pow-num">{fmtCurrency(r.revenue)}</td>
              <td className={`pow-num ${r.timeLeft < 0 ? 'pow-neg' : ''}`}>{fmtCurrency(r.timeLeft)}</td>
            </tr>
          ))}
          <tr className="pow-table-total">
            <td colSpan={2}>Total Billable</td>
            <td className="pow-num">{fmtCurrency(totalBillable)}</td>
            <td className="pow-num">{fmtCurrency(totalRevenue)}</td>
            <td className={`pow-num ${totalTimeLeft < 0 ? 'pow-neg' : ''}`}>{fmtCurrency(totalTimeLeft)}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="pow-section-title">Non-Billable</h3>
      <table className="pow-table">
        <thead>
          <tr>
            <th scope="col">Job No</th>
            <th scope="col">Job Name</th>
            <th scope="col" className="pow-num">Current Time ($)</th>
            <th scope="col" className="pow-num">% of total</th>
          </tr>
        </thead>
        <tbody>
          {nonBillableRows.map(r => (
            <tr key={r.jobId}>
              <td>{r.jobId}</td>
              <td>{r.jobName}</td>
              <td className="pow-num">{fmtCurrency(r.currentTime)}</td>
              <td className="pow-num">{(r.pctOfTotal * 100).toFixed(1)}%</td>
            </tr>
          ))}
          <tr className="pow-table-total">
            <td colSpan={2}>Total Non-Billable</td>
            <td className="pow-num">{fmtCurrency(totalNonBillable)}</td>
            <td className="pow-num"></td>
          </tr>
        </tbody>
      </table>

      <div className="pow-totals-grid">
        <div className="pow-totals-row">
          <span>Total (Billable + Non-Billable)</span>
          <strong>{fmtCurrency(grandTotal)}</strong>
        </div>
        <div className="pow-totals-row">
          <span>Streamtime report total</span>
          <strong>{fmtCurrency(reportTotal)}</strong>
        </div>
        <div className={`pow-totals-row pow-totals-variance ${Math.abs(variance) > 0.01 ? 'is-bad' : 'is-good'}`}>
          <span>Variance</span>
          <strong>{fmtCurrency(variance)}</strong>
        </div>
      </div>
      {Math.abs(variance) > 0.01 && (
        <p className="pow-muted">
          Variance is non-zero — Streamtime has time logged against jobs not displayed here.
          Likely a billable job missing from the revenue list, or a job with neither billable status nor revenue entry.
        </p>
      )}
    </div>
  )
}
