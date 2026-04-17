'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWizard } from './_components/WizardContext'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CoverageRow = {
  date:        string
  campaign:    string  // set from Setup.campaign at submit time
  publication: string
  country:     string
  mediaType:   string
  mediaFormat: string
  headline:    string
  reach:       string
  ave:         string
  prValue:     string
  sentiment:   string
  keyMsg:      string
  spokes:      string
  image:       string
  cta:         string
  link:        string
}

type DestMode  = 'existing' | 'new'
type Operator  = 'AND' | 'OR'
type Status    = { type: 'info' | 'success' | 'error'; message: string } | null
type Result    = { ok: true; sheetUrl?: string } | { ok: false; error: string }

type SetupState = {
  campaign:       string
  // Key messages — per-item operators: ops[i] is the operator BETWEEN item i and item i+1
  keyMessages:    string[]
  keyMsgOps:      Operator[]   // length === keyMessages.length - 1
  // Spokespersons — same per-item operator pattern
  spokespersons:  string[]
  spokesOps:      Operator[]   // length === spokespersons.length - 1
  // CTAs — same per-item operator pattern
  ctas:           string[]
  ctaOps:         Operator[]   // length === ctas.length - 1
  // Destination
  destMode:       DestMode
  sheetUrl:       string
  sheetTab:       string
  newTitle:       string
  newTab:         string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_TYPES   = ['Metro', 'Regional', 'National', 'Lifestyle', 'Sports', 'Marketing Trade']
const MEDIA_FORMATS = ['ONLINE', 'PRINT', 'TV', 'RADIO', 'SOCIAL MEDIA', 'PODCAST']
const YES_NO        = ['YES', 'NO']
const SENTIMENTS    = ['POSITIVE', 'NEGATIVE']

const DEFAULT_TAB   = '2026 Coverage Tracker'

/** Initial/reset value for SetupState */
const EMPTY_SETUP: SetupState = {
  campaign:      '',
  keyMessages:   [''],
  keyMsgOps:     [],
  spokespersons: [''],
  spokesOps:     [],
  ctas:          [''],
  ctaOps:        [],
  destMode:      'existing',
  sheetUrl:      '',
  sheetTab:      DEFAULT_TAB,
  newTitle:      '',
  newTab:        DEFAULT_TAB,
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing & field mapping
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines   = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('File has fewer than 2 lines')
  const headers = lines[0].split('\t').map(h => h.replace(/^['"]+|['"]+$/g, '').trim())
  return lines.slice(1)
    .map(line => {
      const vals = line.split('\t')
      return headers.reduce<Record<string, string>>((obj, h, i) => {
        obj[h] = (vals[i] ?? '').replace(/^['"]+|['"]+$/g, '').trim()
        return obj
      }, {})
    })
    .filter(r => r['Title'] || r['Source Name'])
}

function fmtDate(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d
}

function deriveFormat(sourceType: string): string {
  const s = (sourceType ?? '').toLowerCase()
  if (s.includes('print'))                            return 'PRINT'
  if (s.includes('online'))                           return 'ONLINE'
  if (s.includes('broadcast') || s.includes('tv'))    return 'TV'
  if (s.includes('radio')     || s.includes('audio')) return 'RADIO'
  if (s.includes('social'))                           return 'SOCIAL MEDIA'
  if (s.includes('podcast'))                          return 'PODCAST'
  return 'ONLINE'
}

function fmtSentiment(s: string): string {
  const lower = (s ?? '').toLowerCase()
  // Neutral is treated as Positive — only POSITIVE / NEGATIVE exist in the tracker
  if (lower === 'positive' || lower === 'neutral') return 'POSITIVE'
  if (lower === 'negative')                        return 'NEGATIVE'
  return s ? s.toUpperCase() : ''
}

function parseAVE(v: string): string {
  if (!v || v === 'NaN') return ''
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? '' : String(n)
}

function mapRow(r: Record<string, string>): CoverageRow {
  const ave    = parseAVE(r['AVE'] ?? '')
  const aveNum = ave !== '' ? parseFloat(ave) : 0
  return {
    date:        fmtDate(r['Date'] ?? ''),
    campaign:    '',
    publication: r['Source Name']  ?? '',
    country:     r['Country']      ?? '',
    mediaType:   '',
    mediaFormat: deriveFormat(r['Source Type'] ?? ''),
    headline:    r['Title']        ?? '',
    reach:       r['Reach']        ?? '',
    ave,
    prValue:     aveNum > 0 ? String((aveNum * 3).toFixed(2)) : '',
    sentiment:   fmtSentiment(r['Sentiment'] ?? ''),
    keyMsg:      '',
    spokes:      '',
    image:       '',
    cta:         '',
    link:        r['URL']          ?? '',
  }
}

function rowToArray(r: CoverageRow): (string | number)[] {
  return [
    r.date, r.campaign, r.publication, r.country,
    r.mediaType, r.mediaFormat, r.headline,
    r.reach   !== '' ? (Number(r.reach)   || r.reach)   : '',
    r.ave     !== '' ? (Number(r.ave)     || r.ave)     : '',
    r.prValue !== '' ? (Number(r.prValue) || 0)         : 0,
    r.sentiment, r.keyMsg, r.spokes, r.image, r.cta, r.link,
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// RepeatingField — shared component for Key Messages, Spokespersons, CTAs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a list of text inputs where:
 *   - Items can be added/removed
 *   - A per-item AND/OR toggle appears BETWEEN adjacent items (ops[i] sits
 *     between items[i] and items[i+1]), only visible when there are ≥2 items
 *   - The "Add" button appears once the last item has content
 */
function RepeatingField({
  label, items, ops, placeholder,
  onUpdate, onAdd, onRemove, onSetOp,
}: {
  label:       string
  items:       string[]
  ops:         Operator[]
  placeholder: string
  onUpdate:    (idx: number, value: string) => void
  onAdd:       () => void
  onRemove:    (idx: number) => void
  onSetOp:     (idx: number, op: Operator) => void
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="ct-label">{label}</label>
      <div className="ct-field-group">
        {items.map((item, i) => (
          <div key={i}>
            {/* AND/OR toggle ABOVE this item (between items[i-1] and items[i]) */}
            {i > 0 && (
              <div className="ct-op-toggle" style={{ marginBottom: 6 }}>
                {(['AND', 'OR'] as Operator[]).map(op => (
                  <button
                    key={op}
                    type="button"
                    className={`ct-btn ct-btn-toggle${ops[i - 1] === op ? ' is-active' : ''}`}
                    onClick={() => onSetOp(i - 1, op)}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
            <div className="ct-field-row">
              <input
                type="text"
                className="ct-input"
                value={item}
                onChange={e => onUpdate(i, e.target.value)}
                placeholder={`${placeholder} ${i + 1}`}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  className="ct-remove-btn"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${label} ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {items[items.length - 1].trim() !== '' && (
        <button type="button" className="ct-btn ct-btn-add" onClick={onAdd} style={{ marginTop: 8 }}>
          + Add another {label.replace(/\(s\)$/, '').replace(/\(.*\)$/, '').trim().toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBanner
// ─────────────────────────────────────────────────────────────────────────────

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null
  return (
    <div
      className={`ct-banner ${status.type}`}
      // Message may include a safe anchor tag for sheet links
      dangerouslySetInnerHTML={{ __html: status.message }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

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
    const popup = window.open('/api/drive/auth', 'drive-auth', 'width=520,height=660,left=200,top=100')
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

  // ── Wizard state ──────────────────────────────────────────────
  const [rows,        setRows]        = useState<CoverageRow[]>([])
  const [status,      setStatus]      = useState<Status>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result,      setResult]      = useState<Result | null>(null)

  // Setup + destination combined state
  const [setup, setSetup] = useState<SetupState>(EMPTY_SETUP)

  // Esc closes the confirmation modal. Guard with `submitting` so an in-flight
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
        setRows(parsed.map(mapRow))
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

  /**
   * Batch apply helper.
   *   mode='all'    — overwrite every row
   *   mode='blanks' — only fill cells that are currently empty
   */
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

  // ── Setup helpers — generic repeating-field factory ──────────
  /**
   * Returns CRUD helpers for a repeating field that has per-item AND/OR
   * operators between adjacent entries.
   *
   *   items  = the string array (e.g. keyMessages)
   *   ops    = operator array of length items.length - 1
   *            ops[i] is the operator BETWEEN items[i] and items[i+1]
   *
   * When an item is added, a default 'AND' operator is appended to ops.
   * When an item is removed at index i, ops[i-1] (or ops[i]) is also removed
   * so the lengths stay in sync.
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
          // Remove the operator that was between this item and its neighbour.
          // If removing first item, remove ops[0]; otherwise remove ops[idx-1].
          const ops   = (s[opsKey] as Operator[]).filter((_, i) => i !== Math.max(0, idx - 1))
          return { ...s, [itemsKey]: items, [opsKey]: ops }
        })
      },
      setOp(idx: number, op: Operator) {
        // idx = position in ops array (between items[idx] and items[idx+1])
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

    // Stamp every row with the campaign from Setup before sending
    const stampedRows = rows.map(r => ({ ...r, campaign: setup.campaign }))
    const rowArrays   = stampedRows.map(rowToArray)

    // Clean setup arrays; per-item operators passed for downstream Gemini use
    const cleanKeyMessages   = setup.keyMessages.map(m => m.trim()).filter(Boolean)
    const cleanSpokespersons = setup.spokespersons.map(s => s.trim()).filter(Boolean)
    const cleanCtas          = setup.ctas.map(c => c.trim()).filter(Boolean)

    // Shared payload fragment
    const setupPayload = {
      campaign:              setup.campaign   || undefined,
      keyMessages:           cleanKeyMessages,
      keyMessageOperators:   setup.keyMsgOps,   // per-item operators between adjacent entries
      spokespersons:         cleanSpokespersons,
      spokesOperators:       setup.spokesOps,
      ctas:                  cleanCtas,
      ctaOperators:          setup.ctaOps,
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
            sheetTab: setup.sheetTab || DEFAULT_TAB,
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
            sheetTab:   setup.newTab   || DEFAULT_TAB,
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

  // ── Destination summary (used in confirmation modal copy) ─────
  const destSummary = setup.destMode === 'existing'
    ? `"${setup.sheetTab || DEFAULT_TAB}" tab of the existing sheet`
    : `tab "${setup.newTab || DEFAULT_TAB}" in new sheet "${setup.newTitle || 'Coverage Tracker'}"`

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="ct-main">

      {/* ── Drive connection banner ── */}
      {driveStatus !== 'connected' && (
        <div className="ct-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderColor: driveStatus === 'connecting' ? 'var(--accent)' : 'var(--border)' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
              {driveStatus === 'connecting' ? 'Connecting to Google Drive…' : 'Connect Google Drive to get started'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Your Google account writes directly to Sheets — no spreadsheet sharing setup required.
            </p>
          </div>
          <button
            type="button"
            onClick={connectDrive}
            disabled={driveStatus === 'connecting' || driveStatus === 'unknown'}
            className="ct-btn ct-btn-primary"
            style={{ flexShrink: 0 }}
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
              <input ref={fileInputRef} type="file" accept=".csv,.tsv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
              <StatusBanner status={status} />
            </div>
          )}

          {/* ── Step 2: Setup (campaign + destination) ── */}
          {step === 2 && (
            <div className="ct-card">
              <p className="ct-card-title">Campaign Setup</p>

              {/* Campaign */}
              <div style={{ marginBottom: 18 }}>
                <label className="ct-label">Campaign</label>
                <input
                  type="text"
                  className="ct-input"
                  value={setup.campaign}
                  onChange={e => setSetup(s => ({ ...s, campaign: e.target.value }))}
                  placeholder="e.g. NFL Australia 2026 Launch"
                />
              </div>

              {/* Key messages — repeating + per-item AND/OR */}
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

              {/* Spokespersons — repeating + per-item AND/OR */}
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

              {/* CTAs — repeating + per-item AND/OR */}
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

              {/* ── Destination ── */}
              <div style={{ borderTop: '2px solid var(--border)', margin: '24px 0 20px', paddingTop: 20 }}>
                <p className="ct-card-title" style={{ marginBottom: 16 }}>Destination</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <label className="ct-label">Google Sheet URL</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.sheetUrl}
                        onChange={e => setSetup(s => ({ ...s, sheetUrl: e.target.value }))}
                        placeholder="https://docs.google.com/spreadsheets/d/…"
                      />
                    </div>
                    <div style={{ minWidth: 200 }}>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <label className="ct-label">Spreadsheet Title</label>
                      <input
                        type="text"
                        className="ct-input"
                        value={setup.newTitle}
                        onChange={e => setSetup(s => ({ ...s, newTitle: e.target.value }))}
                        placeholder="e.g. NFL Coverage Tracker 2026"
                      />
                    </div>
                    <div style={{ minWidth: 200 }}>
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

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => setStep(3)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <p className="ct-card-title" style={{ margin: 0 }}>Review &amp; Submit</p>
                <span style={{ padding: '2px 10px', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>

              {/* Batch defaults panel */}
              <div className="ct-batch-panel">
                <p className="ct-batch-title">
                  Batch defaults — set values below, then apply to all rows or only the blanks
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                  {[
                    { lbl: 'Media Type',   val: bMediaType, set: setBMediaType, opts: MEDIA_TYPES },
                    { lbl: 'Key Messages', val: bKeyMsg,    set: setBKeyMsg,    opts: YES_NO },
                    { lbl: 'Spokes Quote', val: bSpokes,    set: setBSpokes,    opts: YES_NO },
                    { lbl: 'Image',        val: bImage,     set: setBImage,     opts: YES_NO },
                    { lbl: 'CTA',          val: bCta,       set: setBCta,       opts: YES_NO },
                  ].map(({ lbl, val, set, opts }) => (
                    <div key={lbl} style={{ minWidth: 130 }}>
                      <label className="ct-label">{lbl}</label>
                      <select className="ct-select" value={val} onChange={e => set(e.target.value)}>
                        <option value="">— keep —</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="ct-btn ct-btn-primary"   onClick={() => applyBatch('all')}>Apply to All</button>
                    <button type="button" className="ct-btn ct-btn-secondary" onClick={() => applyBatch('blanks')}>Apply to Blanks</button>
                  </div>
                </div>
              </div>

              {/* Preview table — Campaign column removed (now set once in Setup) */}
              <div style={{ overflowX: 'auto', border: '2px solid var(--border)', maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1400, fontSize: 12 }}>
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
                        <th key={h} style={{
                          padding: '8px 7px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          color:      editable ? 'var(--accent)' : 'var(--text-muted)',
                          background: editable ? 'rgba(255,230,0,0.06)' : 'var(--surface)',
                          borderBottom: '2px solid var(--border)',
                          whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 9,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                        <td style={{ padding: '4px 7px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.date}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.publication}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)' }}>{r.country}</td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select className="ct-select" style={{ fontSize: 12, padding: '3px 6px' }} value={r.mediaType} onChange={e => updateRow(idx, 'mediaType', e.target.value)}>
                            <option value="">—</option>
                            {MEDIA_TYPES.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select className="ct-select" style={{ fontSize: 12, padding: '3px 6px' }} value={r.mediaFormat} onChange={e => updateRow(idx, 'mediaFormat', e.target.value)}>
                            {MEDIA_FORMATS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.headline}>{r.headline}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.reach ? Number(r.reach).toLocaleString() : ''}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.ave !== '' ? Number(r.ave).toFixed(2) : '—'}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.prValue !== '' ? Number(r.prValue).toFixed(2) : '—'}</td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select className="ct-select" style={{ fontSize: 12, padding: '3px 6px' }} value={r.sentiment} onChange={e => updateRow(idx, 'sentiment', e.target.value)}>
                            <option value="">—</option>
                            {SENTIMENTS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        {(['keyMsg', 'spokes', 'image', 'cta'] as const).map(field => (
                          <td key={field} style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                            <select className="ct-select" style={{ fontSize: 12, padding: '3px 6px' }} value={r[field]} onChange={e => updateRow(idx, field, e.target.value)}>
                              <option value="">—</option>
                              {YES_NO.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </td>
                        ))}
                        <td style={{ padding: '4px 7px', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.link && <a href={r.link} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12 }}>↗</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 16 }}>
                <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  disabled={submitting}
                  onClick={() => setShowConfirm(true)}
                >
                  {setup.destMode === 'new' ? 'Create Spreadsheet & Add Rows' : 'Append to Google Sheet'}
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'} ready
                </span>
              </div>
              <StatusBanner status={status} />
            </div>
          )}

          {/* ── Step 4: Result (success / failure) ── */}
          {step === 4 && result && result.ok && (
            <div className="ct-card" style={{ textAlign: 'center', padding: '44px 24px' }}>
              <div className="ct-success-circle">✓</div>
              <h2 className="ct-result-heading">
                {rows.length === 1 ? 'Coverage Logged!' : `${rows.length} Rows Logged!`}
              </h2>
              <p className="ct-result-detail">
                {setup.destMode === 'existing'
                  ? <>Appended to <strong>{setup.sheetTab || DEFAULT_TAB}</strong> in your existing sheet.</>
                  : <>Created <strong>{setup.newTitle || 'Coverage Tracker'}</strong> with tab <strong>{setup.newTab || DEFAULT_TAB}</strong>.</>}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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
            <div className="ct-card" style={{ textAlign: 'center', padding: '44px 24px' }}>
              <div className="ct-failure-circle">✕</div>
              <h2 className="ct-result-heading">Submission Failed</h2>
              <p className="ct-result-detail">{result.error}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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
