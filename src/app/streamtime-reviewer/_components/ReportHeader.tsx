'use client'

import { useState } from 'react'
import { useReport } from './ReportContext'

function lastMondaySunday() {
  const today = new Date()
  const day = today.getDay() // 0=Sun … 6=Sat
  // Walk back to the most recent Sunday (inclusive of today when today IS Sunday)
  const sun = new Date(today)
  sun.setDate(today.getDate() - (day === 0 ? 0 : day))
  const mon = new Date(sun)
  mon.setDate(sun.getDate() - 6)
  const fmt = (d: Date) => {
    const y  = d.getFullYear()
    const m  = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  return { from: fmt(mon), to: fmt(sun) }
}

interface Props { isAdmin: boolean }

export default function ReportHeader({ isAdmin }: Props) {
  const { runReport, saveReport, isSaving, period, entries } = useReport()
  const defaults = lastMondaySunday()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo,   setDateTo]   = useState(defaults.to)
  const [running,  setRunning]  = useState(false)
  const [saveMsg,  setSaveMsg]  = useState<'saved' | 'error' | null>(null)

  const hasData = entries.length > 0

  async function handleRun() {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return
    setRunning(true)
    await runReport(dateFrom, dateTo)
    setRunning(false)
  }

  async function handleSave() {
    setSaveMsg(null)
    try {
      await saveReport()
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch {
      setSaveMsg('error')
    }
  }

  const fmtPeriod = (p: { from: string; to: string }) =>
    [p.from, p.to].map(d => d.slice(5).split('-').reverse().join('/') + '/' + d.slice(0, 4)).join(' → ')

  return (
    <div className="sr-report-header">
      <div className="sr-header-controls">
        <div className="sr-date-group">
          <label className="sr-date-label" htmlFor="date-from">FROM</label>
          <input
            id="date-from"
            type="date"
            className="sr-date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <span className="sr-date-sep" aria-hidden="true">→</span>
        <div className="sr-date-group">
          <label className="sr-date-label" htmlFor="date-to">TO</label>
          <input
            id="date-to"
            type="date"
            className="sr-date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        <button
          className="sr-run-btn"
          onClick={handleRun}
          disabled={running || !dateFrom || !dateTo}
        >
          {running ? 'Running…' : 'Run Report'}
        </button>

        {isAdmin && hasData && (
          <button
            className="sr-save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Report'}
          </button>
        )}

        {saveMsg === 'saved' && <span className="sr-save-msg sr-save-msg--ok">Saved ✓</span>}
        {saveMsg === 'error' && <span className="sr-save-msg sr-save-msg--err">Save failed</span>}
      </div>

      {period && (
        <p className="sr-period-tag">{fmtPeriod(period)}</p>
      )}
    </div>
  )
}
