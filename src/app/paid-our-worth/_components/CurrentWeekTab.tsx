'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { listRevenueByMonth, listNotesByMonth, saveSnapshot } from '../_actions'
import { workingDaysInMonth, workingDaysToCutoff, firstOfMonth } from '../_lib/holidays'
import type { JobTotal } from '../_lib/aggregateJobs'
import type { NoteColumn, NoteRecord, RevenueEntry } from '../_types'
import NoteCell from './NoteCell'
import { useReport } from './ReportContext'

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
  const { isAdmin } = useReport()
  const [cutoff, setCutoff]           = useState<string>(todayIso())
  const [savingSnap, startSaveSnap]   = useTransition()
  const [snapMsg, setSnapMsg]         = useState<string | null>(null)
  const [revenue, setRevenue]         = useState<RevenueEntry[]>([])
  const [jobTotals, setJobTotals]     = useState<JobTotal[]>([])
  const [reportTotal, setReportTotal] = useState<number>(0)
  const [notes, setNotes]             = useState<NoteRecord[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const dateFrom = useMemo(() => firstOfMonth(cutoff), [cutoff])
  const periodMonth = useMemo(() => cutoff.slice(0, 7), [cutoff])

  const workingDaysMonth = useMemo(() => workingDaysInMonth(cutoff), [cutoff])
  const daysWorked       = useMemo(() => workingDaysToCutoff(cutoff), [cutoff])

  const [hasFetched, setHasFetched] = useState(false)

  /** Refresh local data only — does NOT hit Streamtime. */
  async function refreshLocal(month: string) {
    try {
      const [{ entries }, { notes: noteRows }] = await Promise.all([
        listRevenueByMonth(month),
        listNotesByMonth(month),
      ])
      setRevenue(entries)
      setNotes(noteRows)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /** Hit Streamtime + reload local data. Only via explicit user action. */
  async function refetch() {
    setLoading(true)
    setError(null)
    try {
      const [{ entries }, totalsRes, { notes: noteRows }] = await Promise.all([
        listRevenueByMonth(periodMonth),
        fetch('/api/paid-our-worth/job-totals', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ dateFrom, dateTo: cutoff }),
        }).then(async r => {
          if (!r.ok) throw new Error(`Streamtime fetch failed (${r.status})`)
          return r.json() as Promise<JobTotalsResponse>
        }),
        listNotesByMonth(periodMonth),
      ])
      setRevenue(entries)
      setJobTotals(totalsRes.jobTotals)
      setReportTotal(totalsRes.reportTotal)
      setNotes(noteRows)
      setHasFetched(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Load revenue + notes when the period changes. Does NOT hit Streamtime —
  // the user must click Refetch to pull live time data.
  useEffect(() => {
    void refreshLocal(periodMonth)
    setJobTotals([])
    setReportTotal(0)
    setHasFetched(false)
  }, [periodMonth])

  const totalsByJob = useMemo(() => {
    const m = new Map<string, JobTotal>()
    for (const t of jobTotals) m.set(t.jobNumber, t)
    return m
  }, [jobTotals])

  const notesByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of notes) m.set(`${n.jobId}::${n.columnKey}`, n.body)
    return m
  }, [notes])
  const noteFor = (jobId: string, col: NoteColumn): string => notesByKey.get(`${jobId}::${col}`) ?? ''

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
      .sort((a, b) => Number(a.jobNumber) - Number(b.jobNumber))
      .map(t => ({
        jobId:       t.jobNumber,
        jobName:     t.jobName,
        currentTime: t.currentTime,
        pctOfTotal:  total > 0 ? t.currentTime / total : 0,
      }))
  }, [jobTotals])

  function commitSnapshot() {
    startSaveSnap(async () => {
      try {
        await saveSnapshot({
          periodMonth,
          cutoffDate:         cutoff,
          workingDaysInMonth: workingDaysMonth,
          daysWorked,
          reportTotal,
          billable:    billableRows,
          nonBillable: nonBillableRows,
        })
        setSnapMsg('Snapshot saved.')
        window.setTimeout(() => setSnapMsg(null), 3000)
      } catch (e) {
        setSnapMsg(`Save failed: ${(e as Error).message}`)
      }
    })
  }

  const totalBillable    = billableRows.reduce((s, r) => s + r.currentTime, 0)
  const totalRevenue     = billableRows.reduce((s, r) => s + r.revenue, 0)
  const totalTimeLeft    = billableRows.reduce((s, r) => s + r.timeLeft, 0)
  const totalNonBillable = nonBillableRows.reduce((s, r) => s + r.currentTime, 0)
  const grandTotal       = totalBillable + totalNonBillable
  const variance         = grandTotal - reportTotal

  return (
    <div className="pow-current">
      <div className="pow-current-head">
        <div className="pow-date-group">
          <label className="pow-date-label" htmlFor="pow-cutoff">TIME UP TO</label>
          <input
            id="pow-cutoff"
            type="date"
            className="pow-date-input"
            value={cutoff}
            max={todayIso()}
            onChange={e => setCutoff(e.target.value)}
            onClick={e => {
              const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
              try { el.showPicker?.() } catch {}
            }}
          />
        </div>

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
            <span className="pow-stat-label">Cutoff</span>
            <span className="pow-stat-value">{fmtDate(cutoff)}</span>
          </div>
        </div>

        <div className="pow-current-actions">
          <button
            type="button"
            className="pow-btn pow-btn--primary"
            onClick={refetch}
            disabled={loading}
          >
            {loading ? 'Fetching…' : hasFetched ? 'Refetch Streamtime' : 'Run report'}
          </button>
          {isAdmin && (
            <button
              type="button"
              className="pow-btn"
              onClick={commitSnapshot}
              disabled={loading || savingSnap || revenue.length === 0 || !hasFetched}
              title={!hasFetched ? 'Run the report first' : undefined}
            >
              {savingSnap ? 'Saving…' : 'Save snapshot'}
            </button>
          )}
        </div>
      </div>
      {snapMsg && <div className="pow-banner pow-banner--ok" role="status">{snapMsg}</div>}

      {error && <div className="pow-banner pow-banner--err" role="alert">{error}</div>}

      {revenue.length === 0 && !loading && (
        <div className="pow-banner pow-banner--err">
          No revenue entries for {periodMonth}. Upload a CSV in the Revenue Config tab.
        </div>
      )}

      <h3 className="pow-section-title">Billable</h3>
      <div className="pow-table-wrap">
      <table className="pow-table pow-table--billable">
        <colgroup>
          <col className="pow-col-jobno" />
          <col className="pow-col-jobname" />
          <col className="pow-col-money" />
          <col className="pow-col-money" />
          <col className="pow-col-money" />
          <col className="pow-col-note" />
          <col className="pow-col-note" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Job No</th>
            <th scope="col">Job Name</th>
            <th scope="col" className="pow-num">Current Time ($)</th>
            <th scope="col" className="pow-num">Revenue ($)</th>
            <th scope="col" className="pow-num">Time Left</th>
            <th scope="col">Marti — for response</th>
            <th scope="col">Response</th>
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
              <td>
                <NoteCell
                  periodMonth={periodMonth}
                  jobId={r.jobId}
                  columnKey="marti_response"
                  initial={noteFor(r.jobId, 'marti_response')}
                  ariaLabel={`Marti note for ${r.jobId}`}
                />
              </td>
              <td>
                <NoteCell
                  periodMonth={periodMonth}
                  jobId={r.jobId}
                  columnKey="response"
                  initial={noteFor(r.jobId, 'response')}
                  ariaLabel={`Response for ${r.jobId}`}
                />
              </td>
            </tr>
          ))}
          <tr className="pow-table-total">
            <td colSpan={2}>Total Billable</td>
            <td className="pow-num">{fmtCurrency(totalBillable)}</td>
            <td className="pow-num">{fmtCurrency(totalRevenue)}</td>
            <td className={`pow-num ${totalTimeLeft < 0 ? 'pow-neg' : ''}`}>{fmtCurrency(totalTimeLeft)}</td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
      </div>

      <h3 className="pow-section-title">Non-Billable</h3>
      <div className="pow-table-wrap">
      <table className="pow-table pow-table--nonbillable">
        <colgroup>
          <col className="pow-col-jobno" />
          <col className="pow-col-jobname" />
          <col className="pow-col-money" />
          <col className="pow-col-money" />
          <col className="pow-col-note" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Job No</th>
            <th scope="col">Job Name</th>
            <th scope="col" className="pow-num">Current Time ($)</th>
            <th scope="col" className="pow-num">% of total</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {nonBillableRows.map(r => (
            <tr key={r.jobId}>
              <td>{r.jobId}</td>
              <td>{r.jobName}</td>
              <td className="pow-num">{fmtCurrency(r.currentTime)}</td>
              <td className="pow-num">{(r.pctOfTotal * 100).toFixed(1)}%</td>
              <td>
                <NoteCell
                  periodMonth={periodMonth}
                  jobId={r.jobId}
                  columnKey="response"
                  initial={noteFor(r.jobId, 'response')}
                  ariaLabel={`Note for ${r.jobId}`}
                />
              </td>
            </tr>
          ))}
          <tr className="pow-table-total">
            <td colSpan={2}>Total Non-Billable</td>
            <td className="pow-num">{fmtCurrency(totalNonBillable)}</td>
            <td className="pow-num"></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      </div>

      <section className="pow-summary" aria-label="Reconciliation summary">
        <dl className="pow-summary-grid">
          <div className="pow-summary-cell">
            <dt>Billable</dt>
            <dd>{fmtCurrency(totalBillable)}</dd>
          </div>
          <div className="pow-summary-cell">
            <dt>Non-billable</dt>
            <dd>{fmtCurrency(totalNonBillable)}</dd>
          </div>
          <div className="pow-summary-cell pow-summary-cell--strong">
            <dt>Total</dt>
            <dd>{fmtCurrency(grandTotal)}</dd>
          </div>
          <div className="pow-summary-cell">
            <dt>Streamtime report total</dt>
            <dd>{fmtCurrency(reportTotal)}</dd>
          </div>
          <div className={`pow-summary-cell pow-summary-cell--variance ${Math.abs(variance) > 0.01 ? 'is-bad' : 'is-good'}`}>
            <dt>Variance</dt>
            <dd>{fmtCurrency(variance)}</dd>
          </div>
        </dl>
        {hasFetched && Math.abs(variance) > 0.01 && (
          <div className="pow-notice pow-notice--warn" role="note">
            <strong>Variance detected.</strong> Streamtime has{' '}
            <span className="pow-num-inline">{fmtCurrency(Math.abs(variance))}</span>{' '}
            of time logged against jobs not displayed here. A billable job is likely missing
            from the revenue list, or a job has neither a billable flag nor a revenue entry.
          </div>
        )}
      </section>
    </div>
  )
}
