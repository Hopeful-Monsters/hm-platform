'use client'

import { useEffect, useState, useTransition } from 'react'
import { listSnapshots, getSnapshot, deleteSnapshot } from '../_actions'
import type { SavedSnapshot, SavedSnapshotDetail } from '../_types'
import NoteCell from './NoteCell'
import { useReport } from './ReportContext'

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function HistoryTab() {
  const { isAdmin } = useReport()
  const [snapshots, setSnapshots]   = useState<SavedSnapshot[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail]         = useState<SavedSnapshotDetail | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [, startDelete]             = useTransition()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const { snapshots } = await listSnapshots()
        if (!cancelled) setSnapshots(snapshots)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const { snapshot } = await getSnapshot(selectedId)
        if (!cancelled) setDetail(snapshot)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedId])

  function handleDelete(id: string) {
    if (!confirm('Delete this snapshot? Saved notes for the month are kept.')) return
    startDelete(async () => {
      try {
        await deleteSnapshot(id)
        setSnapshots(prev => prev.filter(s => s.id !== id))
        if (selectedId === id) {
          setSelectedId(null)
          setDetail(null)
        }
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="pow-history">
      <div className="pow-history-grid">
        <aside className="pow-history-list">
          <h3 className="pow-section-title">Snapshots {loading && <span className="pow-muted">…</span>}</h3>
          {error && <div className="pow-banner pow-banner--err" role="alert">{error}</div>}
          {snapshots.length === 0 && !loading ? (
            <p className="pow-muted">No snapshots saved yet.</p>
          ) : (
            <ul className="pow-history-items">
              {snapshots.map(s => (
                <li key={s.id} className="pow-history-row">
                  <button
                    type="button"
                    className={`pow-history-item ${selectedId === s.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <span className="pow-history-item-date">{fmtDate(s.cutoffDate)}</span>
                    <span className="pow-history-item-meta">
                      {fmtCurrency(s.totalBillableTime + s.totalNonBillableTime)} · variance{' '}
                      <span className={Math.abs(s.variance) > 0.01 ? 'pow-neg' : ''}>{fmtCurrency(s.variance)}</span>
                    </span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="pow-btn pow-btn--ghost pow-btn--danger pow-history-delete"
                      onClick={() => handleDelete(s.id)}
                      aria-label={`Delete snapshot ${fmtDate(s.cutoffDate)}`}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="pow-history-detail">
          {!detail ? (
            <p className="pow-muted">Select a snapshot to view.</p>
          ) : (
            <SnapshotDetail detail={detail} />
          )}
        </section>
      </div>
    </div>
  )
}

function SnapshotDetail({ detail }: { detail: SavedSnapshotDetail }) {
  const totalBillable    = detail.totalBillableTime
  const totalNonBillable = detail.totalNonBillableTime
  const totalRevenue     = detail.totalRevenue
  const totalTimeLeft    = detail.billable.reduce((s, r) => s + r.timeLeft, 0)
  const grandTotal       = totalBillable + totalNonBillable
  const periodMonth      = detail.periodMonth.slice(0, 7)

  return (
    <div className="pow-history-detail-inner">
      <div className="pow-current-stats">
        <div className="pow-stat">
          <span className="pow-stat-label">Cutoff</span>
          <span className="pow-stat-value">{fmtDate(detail.cutoffDate)}</span>
        </div>
        <div className="pow-stat">
          <span className="pow-stat-label">Working days</span>
          <span className="pow-stat-value">{detail.workingDaysInMonth}</span>
        </div>
        <div className="pow-stat">
          <span className="pow-stat-label">Days worked</span>
          <span className="pow-stat-value">{detail.daysWorked}</span>
        </div>
      </div>

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
          {detail.billable.map(r => (
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
                  initial={r.notes.marti_response ?? ''}
                  ariaLabel={`Marti note for ${r.jobId}`}
                />
              </td>
              <td>
                <NoteCell
                  periodMonth={periodMonth}
                  jobId={r.jobId}
                  columnKey="response"
                  initial={r.notes.response ?? ''}
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
          {detail.nonBillable.map(r => (
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
                  initial={r.notes.response ?? ''}
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
            <dd>{fmtCurrency(detail.reportTotal)}</dd>
          </div>
          <div className={`pow-summary-cell pow-summary-cell--variance ${Math.abs(detail.variance) > 0.01 ? 'is-bad' : 'is-good'}`}>
            <dt>Variance</dt>
            <dd>{fmtCurrency(detail.variance)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
