'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWizard } from './_components/WizardContext'
import { cn } from '@/lib/utils'
import type { FieldRule, PublicationGroup } from './_components/SettingsModal'
import { DEFAULT_COVERAGE_TAB_NAME } from '@/lib/constants/coverage-tracker'
import { DRIVE_AUTH_POPUP } from '@/lib/constants/popup'
import {
  type CoverageRow, type DestMode, type Operator, type Status, type Result,
  type SetupState, EMPTY_SETUP,
  MEDIA_TYPES, MEDIA_FORMATS, YES_NO, SENTIMENTS,
} from '@/lib/coverage-tracker/types'
import { parseCSV, mapRow, rowToArray } from '@/lib/coverage-tracker/csv-parsing'
import { applyRules } from '@/lib/coverage-tracker/rule-engine'
import RepeatingField from './_components/RepeatingField'
import StatusBanner from './_components/StatusBanner'

export default function CoverageTrackerPage() {
  const { step, setStep } = useWizard()

  // ── Drive connection ──────────────────────────────────────────
  const [driveStatus, setDriveStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'connecting'>('unknown')

  useEffect(() => {
    fetch('/api/drive/status')
      .then(r => r.json() as Promise<{ connected: boolean }>)
      .then(d => setDriveStatus(d.connected ? 'connected' : 'disconnected'))
      .catch(() => setDriveStatus('disconnected'))
  }, [])

  const connectDrive = useCallback(() => {
    const popup = window.open('/api/drive/auth', 'drive-auth', DRIVE_AUTH_POPUP)
    if (!popup) { alert('Popup blocked — allow popups for this site and try again.'); return }
    setDriveStatus('connecting')
    let done = false

    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      done = true
      window.removeEventListener('message', onMsg)
      if (e.data?.driveConnected) {
        setDriveStatus('connected')
      } else if (e.data?.driveError) {
        setDriveStatus('disconnected')
        alert(`Drive connection failed: ${String(e.data.driveError)}`)
      }
    }
    window.addEventListener('message', onMsg)

    const poll = setInterval(() => {
      if (!popup.closed) return
      clearInterval(poll)
      window.removeEventListener('message', onMsg)
      if (!done) setDriveStatus('disconnected')
    }, 500)
  }, [])

  // ── Rules + publication groups (org-level settings) ──────────
  // Stored in refs so processFile and the Format onChange handler always read
  // the latest values regardless of when they fire — avoids stale closures.
  const rulesRef  = useRef<FieldRule[]>([])
  const groupsRef = useRef<PublicationGroup[]>([])

  useEffect(() => {
    // Load rules and groups once. Non-fatal — if this fails, rows just won't
    // have rules applied (the tool still works without them).
    Promise.all([
      fetch('/api/coverage-tracker/settings/rules').then(r => r.ok ? r.json() : null),
      fetch('/api/coverage-tracker/settings/publication-groups').then(r => r.ok ? r.json() : null),
    ]).then(([rd, gd]) => {
      if (rd?.rules)  rulesRef.current  = rd.rules
      if (gd?.groups) groupsRef.current = gd.groups
    }).catch(() => { /* non-fatal — rules simply won't apply */ })
  }, [])

  // ── Wizard state ──────────────────────────────────────────────
  const [rows,        setRows]        = useState<CoverageRow[]>([])
  const [status,      setStatus]      = useState<Status>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result,      setResult]      = useState<Result | null>(null)

  const [setup, setSetup] = useState<SetupState>(EMPTY_SETUP)

  // Esc closes the confirmation modal. Guarded by `submitting` so an in-flight
  // submit can't be dismissed by a stray keypress.
  useEffect(() => {
    if (!showConfirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setShowConfirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showConfirm, submitting])

  // Batch defaults (review step)
  const [bMediaType, setBMediaType] = useState('')
  const [bKeyMsg,    setBKeyMsg]    = useState('')
  const [bSpokes,    setBSpokes]    = useState('')
  const [bImage,     setBImage]     = useState('')
  const [bCta,       setBCta]       = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver,   setDragOver]   = useState(false)

  // ── File handling ─────────────────────────────────────────────
  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target!.result as string)
        if (!parsed.length) throw new Error('No data rows found — check the file is a valid Meltwater export')
        // Store mapped rows without applying rules yet — rules run on Setup→Review
        // so changes made in Settings always apply to current data.
        setRows(parsed.map(r => mapRow(r)))
        setStep(2)
        setStatus(null)
      } catch (err: unknown) {
        setStatus({ type: 'error', message: (err as Error).message })
      }
    }
    reader.readAsText(file, 'utf-16')
  }

  // ── Row updates ───────────────────────────────────────────────
  function updateRow(idx: number, field: keyof CoverageRow, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  /** mode='all' overwrites every row; mode='blanks' only fills empty cells. */
  function applyBatch(mode: 'all' | 'blanks') {
    const updates: Partial<CoverageRow> = {
      ...(bMediaType && { mediaType: bMediaType }),
      ...(bKeyMsg    && { keyMsg:    bKeyMsg    }),
      ...(bSpokes    && { spokes:    bSpokes    }),
      ...(bImage     && { image:     bImage     }),
      ...(bCta       && { cta:       bCta       }),
    }
    setRows(prev => prev.map(r => {
      const next = { ...r }
      for (const [k, v] of Object.entries(updates) as [keyof CoverageRow, string][]) {
        if (mode === 'all')                next[k] = v
        else if (mode === 'blanks' && !r[k]) next[k] = v
      }
      return next
    }))
  }

  /**
   * CRUD helpers for a repeating field with per-item AND/OR operators between
   * adjacent entries. ops[i] sits between items[i] and items[i+1]. Adding an
   * item appends a default 'AND'; removing item i drops ops[max(0, i-1)] so
   * the lengths stay in sync.
   */
  function makeRepeatingHelpers<K extends 'keyMessages' | 'spokespersons' | 'ctas'>(
    itemsKey: K,
    opsKey:   K extends 'keyMessages' ? 'keyMsgOps' : K extends 'spokespersons' ? 'spokesOps' : 'ctaOps',
  ) {
    return {
      updateItem(idx: number, value: string) {
        setSetup(s => ({ ...s, [itemsKey]: (s[itemsKey] as string[]).map((v, i) => i === idx ? value : v) }))
      },
      addItem() {
        setSetup(s => ({
          ...s,
          [itemsKey]: [...(s[itemsKey] as string[]), ''],
          [opsKey]:   [...(s[opsKey]   as Operator[]), 'AND'],
        }))
      },
      removeItem(idx: number) {
        setSetup(s => {
          const items = (s[itemsKey] as string[]).filter((_, i) => i !== idx)
          const ops   = (s[opsKey] as Operator[]).filter((_, i) => i !== Math.max(0, idx - 1))
          return { ...s, [itemsKey]: items, [opsKey]: ops }
        })
      },
      setOp(idx: number, op: Operator) {
        setSetup(s => ({
          ...s,
          [opsKey]: (s[opsKey] as Operator[]).map((o, i) => i === idx ? op : o),
        }))
      },
    }
  }

  const keyMsgHelpers = makeRepeatingHelpers('keyMessages', 'keyMsgOps')
  const spokesHelpers = makeRepeatingHelpers('spokespersons', 'spokesOps')
  const ctaHelpers    = makeRepeatingHelpers('ctas', 'ctaOps')

  // ── Submit ────────────────────────────────────────────────────
  async function doSubmit() {
    setShowConfirm(false)
    setSubmitting(true)
    setStatus(null)

    const stampedRows = rows.map(r => ({ ...r, campaign: setup.campaign }))
    const rowArrays   = stampedRows.map(rowToArray)

    const cleanKeyMessages   = setup.keyMessages.map(m => m.trim()).filter(Boolean)
    const cleanSpokespersons = setup.spokespersons.map(s => s.trim()).filter(Boolean)
    const cleanCtas          = setup.ctas.map(c => c.trim()).filter(Boolean)

    const setupPayload = {
      campaign:            setup.campaign   || undefined,
      keyMessages:         cleanKeyMessages,
      keyMessageOperators: setup.keyMsgOps,
      spokespersons:       cleanSpokespersons,
      spokesOperators:     setup.spokesOps,
      ctas:                cleanCtas,
      ctaOperators:        setup.ctaOps,
    }

    try {
      if (setup.destMode === 'existing') {
        const m = setup.sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
        if (!m) throw new Error('URL does not look like a valid Google Sheets link.')

        const res = await fetch('/api/coverage-tracker/sheets/append', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId:  m[1],
            sheetTab: setup.sheetTab || DEFAULT_COVERAGE_TAB_NAME,
            rows:     rowArrays,
            ...setupPayload,
          }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)

        setResult({ ok: true, sheetUrl: `https://docs.google.com/spreadsheets/d/${m[1]}/edit` })
        setStep(4)

      } else {
        const res = await fetch('/api/coverage-tracker/sheets/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetTitle: setup.newTitle || 'Coverage Tracker',
            sheetTab:   setup.newTab   || DEFAULT_COVERAGE_TAB_NAME,
            rows:       rowArrays,
            ...setupPayload,
          }),
        })
        const data = await res.json() as { error?: string; newSheetUrl?: string }
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)

        setResult({ ok: true, sheetUrl: data.newSheetUrl })
        setStep(4)
      }
    } catch (err: unknown) {
      setResult({ ok: false, error: (err as Error).message })
      setStep(4)
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setRows([])
    setStatus(null)
    setResult(null)
    setSetup(EMPTY_SETUP)
    setBMediaType(''); setBKeyMsg(''); setBSpokes(''); setBImage(''); setBCta('')
    setStep(1)
  }

  const destSummary = setup.destMode === 'existing'
    ? `"${setup.sheetTab || DEFAULT_COVERAGE_TAB_NAME}" tab of the existing sheet`
    : `tab "${setup.newTab || DEFAULT_COVERAGE_TAB_NAME}" in new sheet "${setup.newTitle || 'Coverage Tracker'}"`

  return (
    <div className="ct-main">

      {/* ── Drive connection banner ── */}
      {driveStatus !== 'connected' && (
        <div className={cn('ct-card ct-drive-banner', driveStatus === 'connecting' && 'ct-drive-banner--connecting')}>
          <div>
            <p className="ct-drive-title">
              {driveStatus === 'connecting' ? 'Connecting to Google Drive…' : 'Connect Google Drive to get started'}
            </p>
            <p className="ct-drive-sub">
              Your Google account writes directly to Sheets — no spreadsheet sharing setup required.
            </p>
          </div>
          <button
            type="button"
            onClick={connectDrive}
            disabled={driveStatus === 'connecting' || driveStatus === 'unknown'}
            className="ct-btn ct-btn-primary"
          >
            {driveStatus === 'connecting' ? 'Connecting…' : 'Connect Drive'}
          </button>
        </div>
      )}

      {driveStatus === 'connected' && (
        <>
          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="ct-card">
              <p className="ct-card-title">Upload Meltwater CSV</p>
              <div
                className={`ct-drop-zone${dragOver ? ' is-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e  => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e      => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              >
                <div className="ct-drop-icon">📤</div>
                <p className="ct-drop-text">Drop your Meltwater CSV here, or click to browse</p>
                <p className="ct-drop-hint">Accepts the standard UTF-16 tab-delimited .csv export from Meltwater</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
              <StatusBanner status={status} />
            </div>
          )}

          {/* ── Step 2: Setup (campaign + destination) ── */}
          {step === 2 && (
            <div className="ct-card">
              <p className="ct-card-title">Campaign Setup</p>

              <div className="ct-field-wrap">
                <label className="ct-label">Campaign</label>
                <input
                  type="text"
                  className="ct-input"
                  value={setup.campaign}
                  onChange={e => setSetup(s => ({ ...s, campaign: e.target.value }))}
                  placeholder="e.g. NFL Australia 2026 Launch"
                />
              </div>

              <RepeatingField
                label="Key Message(s)"
                items={setup.keyMessages}
                ops={setup.keyMsgOps}
                placeholder="Key message"
                onUpdate={keyMsgHelpers.updateItem}
                onAdd={keyMsgHelpers.addItem}
                onRemove={keyMsgHelpers.removeItem}
                onSetOp={keyMsgHelpers.setOp}
              />

              <RepeatingField
                label="Spokesperson(s)"
                items={setup.spokespersons}
                ops={setup.spokesOps}
                placeholder="Spokesperson"
                onUpdate={spokesHelpers.updateItem}
                onAdd={spokesHelpers.addItem}
                onRemove={spokesHelpers.removeItem}
                onSetOp={spokesHelpers.setOp}
              />

              <RepeatingField
                label="CTA(s)"
                items={setup.ctas}
                ops={setup.ctaOps}
                placeholder="CTA"
                onUpdate={ctaHelpers.updateItem}
                onAdd={ctaHelpers.addItem}
                onRemove={ctaHelpers.removeItem}
                onSetOp={ctaHelpers.setOp}
              />

              <div className="ct-dest-section">
                <p className="ct-card-title ct-card-title--no-margin mb-4">Destination</p>

                <div className="ct-dest-toggle">
                  {(['existing', 'new'] as DestMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      className={`ct-btn ct-btn-toggle${setup.destMode === mode ? ' is-active' : ''}`}
                      onClick={() => setSetup(s => ({ ...s, destMode: mode }))}
                    >
                      {mode === 'existing' ? 'Append to existing sheet' : 'Create new spreadsheet'}
                    </button>
                  ))}
                </div>

                {setup.destMode === 'existing' ? (
                  <div className="ct-dest-row">
                    <div className="ct-dest-url-field">
                      <label className="ct-label">Google Sheet URL</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.sheetUrl}
                        onChange={e => setSetup(s => ({ ...s, sheetUrl: e.target.value }))}
                        placeholder="https://docs.google.com/spreadsheets/d/…"
                      />
                    </div>
                    <div className="ct-dest-tab-field">
                      <label className="ct-label">Tab Name</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.sheetTab}
                        onChange={e => setSetup(s => ({ ...s, sheetTab: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="ct-dest-row">
                    <div className="ct-dest-title-field">
                      <label className="ct-label">Spreadsheet Title</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.newTitle}
                        onChange={e => setSetup(s => ({ ...s, newTitle: e.target.value }))}
                        placeholder="e.g. NFL Coverage Tracker 2026"
                      />
                    </div>
                    <div className="ct-dest-tab-field">
                      <label className="ct-label">Tab Name</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.newTab}
                        onChange={e => setSetup(s => ({ ...s, newTab: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="ct-step-actions">
                <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => {
                    // Apply org rules now, using the latest fetched values from refs.
                    setRows(prev => prev.map(r => applyRules(r, rulesRef.current, groupsRef.current)))
                    setStep(3)
                  }}
                  disabled={
                    !setup.campaign.trim() ||
                    (setup.destMode === 'existing' && !setup.sheetUrl.trim())
                  }
                >
                  Review &amp; Submit →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review table ── */}
          {step === 3 && (
            <div className="ct-card">
              <div className="ct-review-header">
                <p className="ct-card-title ct-card-title--no-margin">Review &amp; Submit</p>
                <span className="ct-row-badge">
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>

              <div className="ct-batch-panel">
                <p className="ct-batch-title">
                  Batch defaults — set values below, then apply to all rows or only the blanks
                </p>
                <div className="ct-batch-defaults-row">
                  {[
                    { lbl: 'Media Type',   val: bMediaType, set: setBMediaType, opts: MEDIA_TYPES },
                    { lbl: 'Key Messages', val: bKeyMsg,    set: setBKeyMsg,    opts: YES_NO },
                    { lbl: 'Spokes Quote', val: bSpokes,    set: setBSpokes,    opts: YES_NO },
                    { lbl: 'Image',        val: bImage,     set: setBImage,     opts: YES_NO },
                    { lbl: 'CTA',          val: bCta,       set: setBCta,       opts: YES_NO },
                  ].map(({ lbl, val, set, opts }) => (
                    <div key={lbl} className="ct-batch-field">
                      <label className="ct-label">{lbl}</label>
                      <select className="ct-select" value={val} onChange={e => set(e.target.value)}>
                        <option value="">— keep —</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="ct-batch-actions">
                    <button type="button" className="ct-btn ct-btn-primary"   onClick={() => applyBatch('all')}>Apply to All</button>
                    <button type="button" className="ct-btn ct-btn-secondary" onClick={() => applyBatch('blanks')}>Apply to Blanks</button>
                  </div>
                </div>
              </div>

              <div className="ct-review-table-wrap">
                <table className="ct-review-table">
                  <thead>
                    <tr>
                      {[
                        { h: '#',           editable: false },
                        { h: 'DATE',        editable: false },
                        { h: 'PUBLICATION', editable: false },
                        { h: 'COUNTRY',     editable: false },
                        { h: 'MEDIA TYPE',  editable: true  },
                        { h: 'FORMAT',      editable: true  },
                        { h: 'HEADLINE',    editable: false },
                        { h: 'REACH',       editable: false },
                        { h: 'AVE',         editable: false },
                        { h: 'PR VALUE',    editable: false },
                        { h: 'SENTIMENT',   editable: true  },
                        { h: 'KEY MSGS',    editable: true  },
                        { h: 'SPOKES',      editable: true  },
                        { h: 'IMAGE',       editable: true  },
                        { h: 'CTA',         editable: true  },
                        { h: 'LINK',        editable: false },
                      ].map(({ h, editable }) => (
                        <th key={h} className={cn('ct-review-th', editable && 'is-editable')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="ct-col-num">{idx + 1}</td>
                        <td className="ct-col-nowrap">{r.date}</td>
                        <td className="ct-col-nowrap">{r.publication}</td>
                        <td className="ct-review-td">{r.country}</td>
                        <td className="ct-col-edit">
                          <select className="ct-select" value={r.mediaType} onChange={e => updateRow(idx, 'mediaType', e.target.value)}>
                            <option value="">—</option>
                            {MEDIA_TYPES.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="ct-col-edit">
                          <select
                            className="ct-select"
                            value={r.mediaFormat}
                            onChange={e => {
                              // Update format first, then re-run rules on the updated row
                              // so format-dependent rules (e.g. TV → image=YES) fire immediately.
                              const updated = { ...r, mediaFormat: e.target.value }
                              const ruled   = applyRules(updated, rulesRef.current, groupsRef.current)
                              setRows(prev => prev.map((row, i) => i === idx ? ruled : row))
                            }}
                          >
                            {MEDIA_FORMATS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="ct-col-headline" title={r.headline}>{r.headline}</td>
                        <td className="ct-col-right">{r.reach ? Number(r.reach).toLocaleString() : ''}</td>
                        <td className="ct-col-right">{r.ave !== '' ? Number(r.ave).toFixed(2) : '—'}</td>
                        <td className="ct-col-right">{r.prValue !== '' ? Number(r.prValue).toFixed(2) : '—'}</td>
                        <td className="ct-col-edit">
                          <select className="ct-select" value={r.sentiment} onChange={e => updateRow(idx, 'sentiment', e.target.value)}>
                            <option value="">—</option>
                            {SENTIMENTS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        {(['keyMsg', 'spokes', 'image', 'cta'] as const).map(field => (
                          <td key={field} className="ct-col-edit">
                            <select className="ct-select" value={r[field]} onChange={e => updateRow(idx, field, e.target.value)}>
                              <option value="">—</option>
                              {YES_NO.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </td>
                        ))}
                        <td className="ct-col-link">
                          {r.link && <a href={r.link} target="_blank" rel="noopener" className="ct-table-link">↗</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ct-submit-bar">
                <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  disabled={submitting}
                  onClick={() => setShowConfirm(true)}
                >
                  {setup.destMode === 'new' ? 'Create Spreadsheet & Add Rows' : 'Append to Google Sheet'}
                </button>
                <span className="ct-row-count-info">
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'} ready
                </span>
              </div>
              <StatusBanner status={status} />
            </div>
          )}

          {/* ── Step 4: Result (success / failure) ── */}
          {step === 4 && result && result.ok && (
            <div className="ct-card ct-card-result">
              <div className="ct-success-circle">✓</div>
              <h2 className="ct-result-heading">
                {rows.length === 1 ? 'Coverage Logged!' : `${rows.length} Rows Logged!`}
              </h2>
              <p className="ct-result-detail">
                {setup.destMode === 'existing'
                  ? <>Appended to <strong>{setup.sheetTab || DEFAULT_COVERAGE_TAB_NAME}</strong> in your existing sheet.</>
                  : <>Created <strong>{setup.newTitle || 'Coverage Tracker'}</strong> with tab <strong>{setup.newTab || DEFAULT_COVERAGE_TAB_NAME}</strong>.</>}
              </p>
              <div className="ct-result-actions">
                {result.sheetUrl && (
                  <a
                    href={result.sheetUrl}
                    target="_blank"
                    rel="noopener"
                    className="ct-btn ct-btn-secondary"
                  >
                    Open Spreadsheet ↗
                  </a>
                )}
                <button type="button" className="ct-btn ct-btn-primary" onClick={resetWizard}>
                  Submit Another Coverage Update
                </button>
              </div>
            </div>
          )}

          {step === 4 && result && !result.ok && (
            <div className="ct-card ct-card-result">
              <div className="ct-failure-circle">✕</div>
              <h2 className="ct-result-heading">Submission Failed</h2>
              <p className="ct-result-detail">{result.error}</p>
              <div className="ct-result-actions">
                <button
                  type="button"
                  className="ct-btn ct-btn-secondary"
                  onClick={() => { setResult(null); setStep(3) }}
                >
                  ← Back to Review
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => { setResult(null); setStep(2) }}
                >
                  Re-check Setup &amp; Retry
                </button>
              </div>
            </div>
          )}

          {/* ── Submit confirmation modal ── */}
          {showConfirm && (
            <div
              className="ct-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ct-confirm-title"
              onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false) }}
            >
              <div className="ct-modal">
                <h3 id="ct-confirm-title" className="ct-modal-title">Confirm Submission</h3>
                <p className="ct-modal-body">
                  Submit <strong>{rows.length}</strong> {rows.length === 1 ? 'row' : 'rows'} to the {destSummary}?
                  <br /><br />
                  This will {setup.destMode === 'existing' ? 'append to the live sheet' : 'create a new Google Sheet on your Drive'}.
                </p>
                <div className="ct-modal-actions">
                  <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setShowConfirm(false)}>
                    Cancel
                  </button>
                  <button type="button" className="ct-btn ct-btn-primary" onClick={doSubmit} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Confirm & Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
