'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  listRevenueByMonth,
  replaceRevenueForMonth,
  updateRevenueRow,
  deleteRevenueRow,
} from '../_actions'
import { parseRevenueCsv } from '../_lib/parseRevenueCsv'
import type { RevenueEntry } from '../_types'

function thisMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

const SAMPLE_CSV = `Job No,Job Name,Revenue
1195,Adobe - Acrobat Studio,30000
1263,Club Med - Monthly Retainer (April 2026),6255
1170,"Converse GP - Class of 2026 Lookbook, Phase 1",23025.48`

export default function RevenueConfigTab() {
  const [periodMonth, setPeriodMonth] = useState<string>(thisMonthIso())
  const [entries, setEntries]         = useState<RevenueEntry[]>([])
  const [loading, setLoading]         = useState(false)
  const [banner, setBanner]           = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [previewRows, setPreviewRows] = useState<Array<{ jobId: string; jobName: string; revenueAmount: number }> | null>(null)
  const [previewErrors, setPreviewErrors] = useState<string[]>([])
  const [csvText, setCsvText]         = useState<string>('')
  const fileRef                       = useRef<HTMLInputElement>(null)
  const [pending, startTransition]    = useTransition()

  async function refresh() {
    setLoading(true)
    try {
      const { entries } = await listRevenueByMonth(periodMonth)
      setEntries(entries)
    } catch (e) {
      setBanner({ kind: 'err', msg: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    setPreviewRows(null)
    setPreviewErrors([])
    setCsvText('')
    if (fileRef.current) fileRef.current.value = ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth])

  function showBanner(kind: 'ok' | 'err', msg: string) {
    setBanner({ kind, msg })
    window.setTimeout(() => setBanner(null), 4000)
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setCsvText(text)
      const result = parseRevenueCsv(text)
      setPreviewRows(result.rows)
      setPreviewErrors(result.errors)
    }
    reader.onerror = () => showBanner('err', 'Failed to read file.')
    reader.readAsText(file)
  }

  function commitUpload() {
    if (!csvText) return
    startTransition(async () => {
      try {
        const { inserted, replaced } = await replaceRevenueForMonth(periodMonth, csvText)
        showBanner('ok', `Saved ${inserted} rows (replaced ${replaced} existing).`)
        setPreviewRows(null)
        setPreviewErrors([])
        setCsvText('')
        if (fileRef.current) fileRef.current.value = ''
        await refresh()
      } catch (e) {
        showBanner('err', (e as Error).message)
      }
    })
  }

  function saveRowEdit(id: string, patch: { jobName?: string; revenueAmount?: number }) {
    startTransition(async () => {
      try {
        await updateRevenueRow(id, patch)
        await refresh()
      } catch (e) {
        showBanner('err', (e as Error).message)
      }
    })
  }

  function deleteRow(id: string) {
    if (!confirm('Delete this revenue row?')) return
    startTransition(async () => {
      try {
        await deleteRevenueRow(id)
        await refresh()
      } catch (e) {
        showBanner('err', (e as Error).message)
      }
    })
  }

  return (
    <div className="pow-config">
      <div className="pow-config-head">
        <label className="pow-field">
          <span className="pow-field-label">Period</span>
          <input
            type="month"
            value={periodMonth}
            onChange={e => setPeriodMonth(e.target.value)}
            className="pow-input"
          />
        </label>

        <div className="pow-config-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
            className="pow-input"
            aria-label="Upload revenue CSV"
          />
        </div>
      </div>

      {banner && (
        <div
          className={`pow-banner pow-banner--${banner.kind}`}
          role={banner.kind === 'err' ? 'alert' : 'status'}
        >
          {banner.msg}
        </div>
      )}

      {previewErrors.length > 0 && (
        <div className="pow-banner pow-banner--err" role="alert">
          <strong>CSV errors:</strong>
          <ul>
            {previewErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {previewRows && previewErrors.length === 0 && (
        <div className="pow-preview">
          <div className="pow-preview-head">
            <span>Preview — {previewRows.length} rows</span>
            <button
              type="button"
              className="pow-btn pow-btn--primary"
              onClick={commitUpload}
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Replace month with CSV'}
            </button>
          </div>
          <RevenueTableReadonly rows={previewRows.map(r => ({
            id: '', jobId: r.jobId, jobName: r.jobName, revenueAmount: r.revenueAmount,
          }))} />
        </div>
      )}

      <details className="pow-help">
        <summary>CSV format</summary>
        <p>Header row: <code>Job No,Job Name,Revenue</code>. Quote names containing commas. Revenue accepts <code>$</code> and thousand separators.</p>
        <pre>{SAMPLE_CSV}</pre>
      </details>

      <h3 className="pow-section-title">Current month entries {loading && <span className="pow-muted">— loading…</span>}</h3>

      {entries.length === 0 && !loading ? (
        <p className="pow-muted">No revenue entries for this month yet. Upload a CSV above.</p>
      ) : (
        <table className="pow-table">
          <thead>
            <tr>
              <th scope="col">Job No</th>
              <th scope="col">Job Name</th>
              <th scope="col" className="pow-num">Revenue</th>
              <th scope="col" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(row => (
              <EditableRow
                key={row.id}
                row={row}
                onSave={saveRowEdit}
                onDelete={deleteRow}
                disabled={pending}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RevenueTableReadonly({ rows }: { rows: Array<{ id: string; jobId: string; jobName: string; revenueAmount: number }> }) {
  return (
    <table className="pow-table">
      <thead>
        <tr>
          <th scope="col">Job No</th>
          <th scope="col">Job Name</th>
          <th scope="col" className="pow-num">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id || i}>
            <td>{r.jobId}</td>
            <td>{r.jobName}</td>
            <td className="pow-num">{fmtCurrency(r.revenueAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EditableRow({
  row, onSave, onDelete, disabled,
}: {
  row: RevenueEntry
  onSave: (id: string, patch: { jobName?: string; revenueAmount?: number }) => void
  onDelete: (id: string) => void
  disabled: boolean
}) {
  const [name, setName] = useState(row.jobName)
  const [rev, setRev]   = useState(String(row.revenueAmount))
  const dirty = name !== row.jobName || Number(rev) !== row.revenueAmount

  function commit() {
    if (!dirty) return
    const patch: { jobName?: string; revenueAmount?: number } = {}
    if (name !== row.jobName) patch.jobName = name
    const n = Number(rev)
    if (!Number.isNaN(n) && n !== row.revenueAmount) patch.revenueAmount = n
    onSave(row.id, patch)
  }

  return (
    <tr>
      <td>{row.jobId}</td>
      <td>
        <input
          className="pow-input pow-input--ghost"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commit}
          aria-label={`Job name for ${row.jobId}`}
          disabled={disabled}
        />
      </td>
      <td className="pow-num">
        <input
          type="number"
          step="0.01"
          className="pow-input pow-input--ghost pow-input--num"
          value={rev}
          onChange={e => setRev(e.target.value)}
          onBlur={commit}
          aria-label={`Revenue for ${row.jobId}`}
          disabled={disabled}
        />
      </td>
      <td>
        <button
          type="button"
          className="pow-btn pow-btn--ghost pow-btn--danger"
          onClick={() => onDelete(row.id)}
          disabled={disabled}
          aria-label={`Delete row ${row.jobId}`}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
