'use client'

import { useEffect, useRef, useState } from 'react'

interface TargetRow {
  streamtimeUserId: string
  displayName: string
  targetPct: number
}

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const [tab,        setTab]       = useState<'ooo' | 'targets'>('ooo')
  const [oooPhrase,  setOooPhrase] = useState('')
  const [targets,    setTargets]   = useState<TargetRow[]>([])
  const [dirty,      setDirty]     = useState(false)
  const [saving,     setSaving]    = useState(false)
  const [banner,     setBanner]    = useState<'saved' | 'error' | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/streamtime/settings/ooo-phrase')
      .then(r => r.json())
      .then(d => setOooPhrase(d.oooPhrase ?? 'out of office'))
    fetch('/api/streamtime/settings/targets')
      .then(r => r.json())
      .then(d => setTargets(d.targets ?? []))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function save() {
    setSaving(true)
    setBanner(null)
    try {
      if (tab === 'ooo') {
        const r = await fetch('/api/streamtime/settings/ooo-phrase', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oooPhrase }),
        })
        if (!r.ok) throw new Error()
      } else {
        const r = await fetch('/api/streamtime/settings/targets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets }),
        })
        if (!r.ok) throw new Error()
      }
      setDirty(false)
      setBanner('saved')
      setTimeout(() => setBanner(null), 3000)
    } catch {
      setBanner('error')
    } finally {
      setSaving(false)
    }
  }

  function updateTargetPct(userId: string, val: number) {
    setTargets(prev => prev.map(t =>
      t.streamtimeUserId === userId ? { ...t, targetPct: val } : t
    ))
    setDirty(true)
  }

  return (
    <div
      className="sr-modal-backdrop"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Streamtime Reviewer Settings"
    >
      <div className="sr-modal">
        <div className="sr-modal-header">
          <h2 className="sr-modal-title">Settings</h2>
          <button className="sr-modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="sr-modal-tabs">
          <button
            className={`sr-modal-tab ${tab === 'ooo' ? 'is-active' : ''}`}
            onClick={() => setTab('ooo')}
          >Out of Office Phrase</button>
          <button
            className={`sr-modal-tab ${tab === 'targets' ? 'is-active' : ''}`}
            onClick={() => setTab('targets')}
          >Billable Targets</button>
        </div>

        <div className="sr-modal-body">
          {tab === 'ooo' && (
            <div className="sr-setting-group">
              <label className="sr-setting-label" htmlFor="ooo-phrase">
                Out of Office phrase
                <span className="sr-setting-hint">
                  Time entries whose job name contains this text (case-insensitive) are counted as OOO.
                </span>
              </label>
              <input
                id="ooo-phrase"
                className="sr-setting-input"
                value={oooPhrase}
                onChange={e => { setOooPhrase(e.target.value); setDirty(true) }}
              />
            </div>
          )}

          {tab === 'targets' && (
            <div className="sr-targets-wrap">
              {targets.length === 0 && (
                <p className="sr-setting-hint">
                  Run a report first — users will appear here once fetched from Streamtime.
                  To pre-populate, save targets after running at least one report.
                </p>
              )}
              {targets.map(t => (
                <div key={t.streamtimeUserId} className="sr-target-row">
                  <span className="sr-target-name">{t.displayName}</span>
                  <div className="sr-target-input-wrap">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="sr-target-input"
                      value={t.targetPct}
                      onChange={e => updateTargetPct(t.streamtimeUserId, Number(e.target.value))}
                      aria-label={`Billable target for ${t.displayName}`}
                    />
                    <span className="sr-target-pct-sign">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {banner === 'saved' && <div className="sr-modal-banner sr-modal-banner--ok">Saved.</div>}
        {banner === 'error' && <div className="sr-modal-banner sr-modal-banner--err">Save failed — check console.</div>}

        <div className="sr-modal-footer">
          <button className="sr-modal-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="sr-modal-save" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
