'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CoverageRow = {
  date:        string
  campaign:    string
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

type DestMode = 'existing' | 'new'
type Step     = 1 | 2 | 3 | 4
type Status   = { type: 'info' | 'success' | 'error'; message: string } | null

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_TYPES   = ['Metro', 'Regional', 'National', 'Lifestyle', 'Sports', 'Marketing Trade']
const MEDIA_FORMATS = ['ONLINE', 'PRINT', 'TV', 'RADIO', 'SOCIAL MEDIA', 'PODCAST']
const YES_NO        = ['YES', 'NO']
const SENTIMENTS    = ['POSITIVE', 'NEUTRAL', 'NEGATIVE']

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
  const map: Record<string, string> = { positive: 'POSITIVE', neutral: 'NEUTRAL', negative: 'NEGATIVE' }
  return map[(s ?? '').toLowerCase()] ?? (s ? s.toUpperCase() : '')
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
// Shared style tokens
// ─────────────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background:   'var(--surface)',
  border:       '2px solid var(--border)',
  padding:      '24px 28px',
  marginBottom: 16,
}

const label: React.CSSProperties = {
  display:       'block',
  fontFamily:    'var(--font-heading)',
  fontWeight:    700,
  fontSize:      11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color:         'var(--text-muted)',
  marginBottom:  5,
}

const inputBase: React.CSSProperties = {
  width:      '100%',
  padding:    '8px 10px',
  background: 'var(--bg)',
  border:     '2px solid var(--border)',
  color:      'var(--text)',
  fontSize:   13,
  fontFamily: 'inherit',
  outline:    'none',
  boxSizing:  'border-box',
}

const selectBase: React.CSSProperties = {
  padding:    '8px 10px',
  background: 'var(--bg)',
  border:     '2px solid var(--border)',
  color:      'var(--text)',
  fontSize:   13,
  fontFamily: 'inherit',
  outline:    'none',
}

const btn: React.CSSProperties = {
  padding:       '9px 20px',
  fontSize:      12,
  fontFamily:    'var(--font-heading)',
  fontWeight:    700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  border:        'none',
  cursor:        'pointer',
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBanner
// ─────────────────────────────────────────────────────────────────────────────

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null
  const c = {
    info:    { bg: 'rgba(255,230,0,0.06)',  border: 'var(--accent)', color: 'var(--accent)' },
    success: { bg: 'rgba(0,200,100,0.08)',  border: '#00c864',       color: '#00c864'       },
    error:   { bg: 'rgba(255,62,191,0.08)', border: 'var(--pink)',   color: 'var(--pink)'   },
  }[status.type]
  return (
    <div
      style={{ padding: '11px 14px', background: c.bg, borderLeft: `3px solid ${c.border}`, color: c.color, fontSize: 13, marginTop: 14 }}
      // Message may include a safe anchor tag for sheet links
      dangerouslySetInnerHTML={{ __html: status.message }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function CoverageTrackerPage() {

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
  const [step,       setStep]       = useState<Step>(1)
  const [rows,       setRows]       = useState<CoverageRow[]>([])
  const [destMode,   setDestMode]   = useState<DestMode>('existing')
  const [status,     setStatus]     = useState<Status>(null)
  const [submitting, setSubmitting] = useState(false)

  // Destination fields
  const [sheetUrl,   setSheetUrl]   = useState('')
  const [sheetTab,   setSheetTab]   = useState('2026 Coverage Tracker')
  const [newTitle,   setNewTitle]   = useState('')
  const [newTab,     setNewTab]     = useState('2026 Coverage Tracker')
  const [shareEmail, setShareEmail] = useState('')

  // Batch defaults
  const [bCampaign,  setBCampaign]  = useState('')
  const [bMediaType, setBMediaType] = useState('')
  const [bKeyMsg,    setBKeyMsg]    = useState('')
  const [bSpokes,    setBSpokes]    = useState('')
  const [bImage,     setBImage]     = useState('')
  const [bCta,       setBCta]       = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Shared input focus handlers ───────────────────────────────
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--accent)')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--border)')

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

  function applyBatch() {
    setRows(prev => prev.map(r => ({
      ...r,
      ...(bCampaign  && { campaign:  bCampaign  }),
      ...(bMediaType && { mediaType: bMediaType }),
      ...(bKeyMsg    && { keyMsg:    bKeyMsg    }),
      ...(bSpokes    && { spokes:    bSpokes    }),
      ...(bImage     && { image:     bImage     }),
      ...(bCta       && { cta:       bCta       }),
    })))
  }

  // ── Submit ────────────────────────────────────────────────────
  async function doSubmit() {
    setSubmitting(true)
    setStatus({ type: 'info', message: `Sending ${rows.length} rows to Google Sheets…` })
    const rowArrays = rows.map(rowToArray)

    try {
      if (destMode === 'existing') {
        const m = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
        if (!m) {
          setStatus({ type: 'error', message: 'URL does not look like a valid Google Sheets link.' })
          setSubmitting(false); return
        }
        const res    = await fetch('/api/coverage-tracker/sheets/append', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetId: m[1], sheetTab: sheetTab || '2026 Coverage Tracker', rows: rowArrays, campaign: rows[0]?.campaign || undefined }),
        })
        const result = await res.json() as { error?: string }
        if (!res.ok) throw new Error(result.error ?? `Server error ${res.status}`)
        setStatus({ type: 'success', message: `✓ Appended ${rows.length} rows to <strong>${sheetTab}</strong>` })

      } else {
        const res    = await fetch('/api/coverage-tracker/sheets/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetTitle: newTitle || 'Coverage Tracker', sheetTab: newTab || '2026 Coverage Tracker', rows: rowArrays, shareEmail: shareEmail || undefined, campaign: rows[0]?.campaign || undefined }),
        })
        const result = await res.json() as { error?: string; newSheetUrl?: string }
        if (!res.ok) throw new Error(result.error ?? `Server error ${res.status}`)
        setStatus({ type: 'success', message: `✓ Created spreadsheet and appended ${rows.length} rows. <a href="${result.newSheetUrl}" target="_blank" rel="noopener" style="color:inherit;font-weight:700;">Open sheet →</a>` })
      }
    } catch (err: unknown) {
      setStatus({ type: 'error', message: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1700, margin: '0 auto', padding: '24px 20px' }}>

      {/* ── Drive connection banner ── */}
      {driveStatus !== 'connected' && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderColor: driveStatus === 'connecting' ? 'var(--accent)' : 'var(--border)' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
              {driveStatus === 'connecting' ? 'Connecting to Google Drive…' : 'Connect Google Drive to get started'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Your Google account writes directly to Sheets — no spreadsheet sharing setup required.
            </p>
          </div>
          <button
            onClick={connectDrive}
            disabled={driveStatus === 'connecting' || driveStatus === 'unknown'}
            style={{ ...btn, background: driveStatus === 'connecting' ? 'var(--border)' : 'var(--accent)', color: driveStatus === 'connecting' ? 'var(--text-muted)' : 'var(--accent-fg)', flexShrink: 0 }}
          >
            {driveStatus === 'connecting' ? 'Connecting…' : 'Connect Drive'}
          </button>
        </div>
      )}

      {driveStatus === 'connected' && (
        <>
          {/* ── Step indicator ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
            {(['Upload CSV', 'Destination', 'Review Rows', 'Submit'] as const).map((lbl, i) => {
              const n        = (i + 1) as Step
              const isDone   = step > n
              const isActive = step === n
              return (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDone ? '#00c864' : isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: isDone ? '#00c864' : isActive ? 'var(--accent)' : 'var(--border)', color: isDone || isActive ? '#000' : 'var(--text-muted)' }}>
                      {isDone ? '✓' : n}
                    </span>
                    {lbl}
                  </div>
                  {i < 3 && <div style={{ width: 32, height: 2, background: 'var(--border)' }} />}
                </div>
              )
            })}
          </div>

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div style={card}>
              <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>
                Upload Meltwater CSV
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
                style={{ border: '2px dashed var(--border)', padding: '52px 32px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>📤</div>
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                  Drop your Meltwater CSV here, or click to browse
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Accepts the standard UTF-16 tab-delimited .csv export from Meltwater
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
              <StatusBanner status={status} />
            </div>
          )}

          {/* ── Step 2: Destination ── */}
          {step === 2 && (
            <div style={card}>
              <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>
                Configure Destination
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['existing', 'new'] as DestMode[]).map(mode => (
                  <button key={mode} onClick={() => setDestMode(mode)} style={{ ...btn, background: destMode === mode ? 'var(--accent)' : 'var(--bg)', color: destMode === mode ? 'var(--accent-fg)' : 'var(--text-muted)', border: `2px solid ${destMode === mode ? 'var(--accent)' : 'var(--border)'}` }}>
                    {mode === 'existing' ? 'Append to existing sheet' : 'Create new spreadsheet'}
                  </button>
                ))}
              </div>

              {destMode === 'existing' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <label style={label}>Google Sheet URL</label>
                    <input type="text" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div style={{ minWidth: 200 }}>
                    <label style={label}>Tab Name</label>
                    <input type="text" value={sheetTab} onChange={e => setSheetTab(e.target.value)} style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <label style={label}>Spreadsheet Title</label>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. NFL Coverage Tracker 2026" style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div style={{ minWidth: 200 }}>
                    <label style={label}>Tab Name</label>
                    <input type="text" value={newTab} onChange={e => setNewTab(e.target.value)} style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <label style={label}>Share with (Google email)</label>
                    <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="yourname@domain.com" style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ ...btn, background: 'var(--bg)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ ...btn, background: 'var(--accent)', color: 'var(--accent-fg)' }}>Review rows →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review table ── */}
          {step === 3 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>
                  Review &amp; Edit Rows
                </p>
                <span style={{ padding: '2px 10px', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>

              {/* Batch defaults panel */}
              <div style={{ background: 'var(--bg)', border: '2px solid var(--border)', padding: '16px 20px', marginBottom: 16 }}>
                <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Batch defaults — apply to all rows, then override per-row below
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={label}>Campaign</label>
                    <input type="text" value={bCampaign} onChange={e => setBCampaign(e.target.value)} style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {[
                    { lbl: 'Media Type',   val: bMediaType, set: setBMediaType, opts: MEDIA_TYPES },
                    { lbl: 'Key Messages', val: bKeyMsg,    set: setBKeyMsg,    opts: YES_NO },
                    { lbl: 'Spokes Quote', val: bSpokes,    set: setBSpokes,    opts: YES_NO },
                    { lbl: 'Image',        val: bImage,     set: setBImage,     opts: YES_NO },
                    { lbl: 'CTA',          val: bCta,       set: setBCta,       opts: YES_NO },
                  ].map(({ lbl, val, set, opts }) => (
                    <div key={lbl} style={{ minWidth: 130 }}>
                      <label style={label}>{lbl}</label>
                      <select value={val} onChange={e => set(e.target.value)} style={selectBase} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">— keep —</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <button onClick={applyBatch} style={{ ...btn, background: 'var(--accent)', color: 'var(--accent-fg)' }}>Apply to all</button>
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', border: '2px solid var(--border)', maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1500, fontSize: 12 }}>
                  <thead>
                    <tr>
                      {[
                        { h: '#',         editable: false },
                        { h: 'DATE',      editable: false },
                        { h: 'CAMPAIGN',  editable: true  },
                        { h: 'PUBLICATION', editable: false },
                        { h: 'COUNTRY',   editable: false },
                        { h: 'MEDIA TYPE', editable: true },
                        { h: 'FORMAT',    editable: true  },
                        { h: 'HEADLINE',  editable: false },
                        { h: 'REACH',     editable: false },
                        { h: 'AVE',       editable: false },
                        { h: 'PR VALUE',  editable: false },
                        { h: 'SENTIMENT', editable: true  },
                        { h: 'KEY MSGS',  editable: true  },
                        { h: 'SPOKES',    editable: true  },
                        { h: 'IMAGE',     editable: true  },
                        { h: 'CTA',       editable: true  },
                        { h: 'LINK',      editable: false },
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
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <input type="text" value={r.campaign} onChange={e => updateRow(idx, 'campaign', e.target.value)} style={{ ...inputBase, minWidth: 120, padding: '3px 6px', fontSize: 12 }} onFocus={onFocus} onBlur={onBlur} />
                        </td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.publication}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)' }}>{r.country}</td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select value={r.mediaType} onChange={e => updateRow(idx, 'mediaType', e.target.value)} style={{ ...selectBase, fontSize: 12, padding: '3px 6px' }} onFocus={onFocus} onBlur={onBlur}>
                            <option value="">—</option>
                            {MEDIA_TYPES.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select value={r.mediaFormat} onChange={e => updateRow(idx, 'mediaFormat', e.target.value)} style={{ ...selectBase, fontSize: 12, padding: '3px 6px' }} onFocus={onFocus} onBlur={onBlur}>
                            {MEDIA_FORMATS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.headline}>{r.headline}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.reach ? Number(r.reach).toLocaleString() : ''}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.ave !== '' ? Number(r.ave).toFixed(2) : '—'}</td>
                        <td style={{ padding: '4px 7px', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.prValue !== '' ? Number(r.prValue).toFixed(2) : '—'}</td>
                        <td style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                          <select value={r.sentiment} onChange={e => updateRow(idx, 'sentiment', e.target.value)} style={{ ...selectBase, fontSize: 12, padding: '3px 6px' }} onFocus={onFocus} onBlur={onBlur}>
                            <option value="">—</option>
                            {SENTIMENTS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        {(['keyMsg', 'spokes', 'image', 'cta'] as const).map(field => (
                          <td key={field} style={{ padding: '2px 4px', background: 'rgba(255,230,0,0.04)' }}>
                            <select value={r[field]} onChange={e => updateRow(idx, field, e.target.value)} style={{ ...selectBase, fontSize: 12, padding: '3px 6px' }} onFocus={onFocus} onBlur={onBlur}>
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

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setStep(2)} style={{ ...btn, background: 'var(--bg)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>← Back</button>
                <button onClick={() => setStep(4)} style={{ ...btn, background: 'var(--accent)', color: 'var(--accent-fg)' }}>Submit →</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Submit ── */}
          {step === 4 && (
            <div style={card}>
              <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>
                Submit to Google Sheets
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={doSubmit}
                  disabled={submitting}
                  style={{ ...btn, background: submitting ? 'var(--border)' : 'var(--accent)', color: submitting ? 'var(--text-muted)' : 'var(--accent-fg)', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Submitting…' : destMode === 'new' ? 'Create Spreadsheet & Add Rows' : 'Append to Google Sheet'}
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'} ready
                </span>
              </div>
              <StatusBanner status={status} />
              {!submitting && (
                <button onClick={() => setStep(3)} style={{ ...btn, background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px 0', marginTop: 8, textTransform: 'none', fontSize: 12, fontFamily: 'inherit', letterSpacing: 0 }}>
                  ← Back to review
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
