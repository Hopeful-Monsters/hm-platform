'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { useReport } from './ReportContext'
import type { SavedReportDetail } from './types'

type ChartScope = 'agency' | 'Creative' | 'Execution' | 'Strategy' | 'Support'

interface Props { isAdmin: boolean }

export default function HistoryTab({ isAdmin }: Props) {
  const { savedReports, loadSavedReports, deleteReport } = useReport()
  const [loading,    setLoading]    = useState(false)
  const [scope,      setScope]      = useState<ChartScope>('agency')
  const [chartType,  setChartType]  = useState<'billable' | 'hours'>('billable')
  const [details,    setDetails]    = useState<SavedReportDetail[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await loadSavedReports()
      setLoading(false)
    }
    load()
  }, [loadSavedReports])

  useEffect(() => {
    if (!savedReports.length) return
    Promise.all(
      savedReports.map(r =>
        fetch(`/api/streamtime/reports/${r.id}`).then(res => res.json())
      )
    ).then(setDetails)
  }, [savedReports])

  const avgTarget = useMemo(() => {
    const stats = scope === 'agency'
      ? details.flatMap(d => d.userStats)
      : details.flatMap(d => d.userStats.filter(s => s.team === scope))
    const withTargets = stats.filter(s => s.targetPct !== null)
    if (!withTargets.length) return null
    const avg = withTargets.reduce((s, u) => s + u.targetPct!, 0) / withTargets.length
    return Math.round(avg * 10) / 10
  }, [details, scope])

  const chartData = useMemo(() => {
    return details
      .slice()
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
      .map(d => {
        const label = d.dateFrom.slice(5).split('-').reverse().join('/')
        const stats = scope === 'agency'
          ? d.userStats
          : d.userStats.filter(s => s.team === scope)

        const totalBill    = stats.reduce((s, u) => s + u.billableHours, 0)
        const totalWorking = stats.reduce((s, u) => s + u.workingHours, 0)
        const totalNB      = stats.reduce((s, u) => s + u.nonBillableHours, 0)
        const totalOoo     = stats.reduce((s, u) => s + u.oooHours, 0)
        const billPct      = totalWorking > 0 ? Math.round(totalBill / totalWorking * 1000) / 10 : 0

        return { week: label, billPct, billable: +totalBill.toFixed(2), nonBillable: +totalNB.toFixed(2), ooo: +totalOoo.toFixed(2) }
      })
  }, [details, scope])

  const scopeOptions: ChartScope[] = ['agency', 'Creative', 'Execution', 'Strategy', 'Support']

  if (loading) {
    return <div className="sr-empty"><p>Loading saved reports…</p></div>
  }

  if (!savedReports.length) {
    return (
      <div className="sr-empty">
        <p>No saved reports yet.</p>
        <p className="sr-empty-hint">Run a report then click <strong>Save Report</strong> (admin only) to start building history.</p>
      </div>
    )
  }

  return (
    <div className="sr-tab-panel">
      <div className="sr-history-list">
        <h3 className="sr-history-heading">Saved Reports</h3>
        <div className="sr-history-items">
          {savedReports.map(r => (
            <div key={r.id} className="sr-history-item">
              <span className="sr-history-dates">
                {r.dateFrom} → {r.dateTo}
              </span>
              <span className="sr-history-meta">{r.entryCount} entries · saved {new Date(r.savedAt).toLocaleDateString('en-AU')}</span>
              {isAdmin && (
                <button
                  className="sr-history-delete"
                  aria-label={`Delete report ${r.dateFrom} to ${r.dateTo}`}
                  onClick={() => {
                    if (confirm(`Delete report ${r.dateFrom} → ${r.dateTo}? This cannot be undone.`)) {
                      deleteReport(r.id)
                    }
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sr-chart-controls">
        <div className="sr-chips">
          {scopeOptions.map(s => (
            <button
              key={s}
              className={`sr-chip ${scope === s ? 'is-active sr-chip--all' : ''}`}
              onClick={() => setScope(s)}
            >
              {s === 'agency' ? 'Agency' : s}
            </button>
          ))}
        </div>
        <div className="sr-chips">
          <button
            className={`sr-chip ${chartType === 'billable' ? 'is-active sr-chip--all' : ''}`}
            onClick={() => setChartType('billable')}
          >Billable %</button>
          <button
            className={`sr-chip ${chartType === 'hours' ? 'is-active sr-chip--all' : ''}`}
            onClick={() => setChartType('hours')}
          >Hours Breakdown</button>
        </div>
      </div>

      {chartData.length >= 1 ? (
        <div className="sr-chart-wrap">
          {chartType === 'billable' ? (
            <>
              <h3 className="sr-chart-title">Billable % over time — {scope === 'agency' ? 'Agency' : scope}</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                    formatter={(v: ValueType | undefined) => [`${v ?? ''}%`, 'Billable Rate']}
                  />
                  <Line type="monotone" dataKey="billPct" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} name="Billable %" />
                  {avgTarget !== null && (
                    <ReferenceLine y={avgTarget} stroke="var(--text-muted)" strokeDasharray="6 3" label={{ value: `Avg target ${avgTarget}%`, fill: 'var(--text-muted)', fontSize: 10, position: 'insideTopRight' }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <h3 className="sr-chart-title">Hours breakdown — {scope === 'agency' ? 'Agency' : scope}</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="billable"    stackId="a" fill="var(--accent)"   name="Billable" />
                  <Bar dataKey="nonBillable" stackId="a" fill="var(--warn)"     name="Non-Billable" />
                  <Bar dataKey="ooo"         stackId="a" fill="var(--text-mid)" name="OOO" />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      ) : (
        <p className="sr-empty-hint sr-empty-hint--mt">
          Save a report to see trend charts.
        </p>
      )}
    </div>
  )
}
