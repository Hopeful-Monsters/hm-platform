'use client'

import { useState, useRef } from 'react'
import { searchCompanies } from '../_actions'

export function SupplierCombobox({
  value,
  companies,
  hasError,
  onInput,
  onSelect,
  onCreateFromInput,
}: {
  value: string
  companies: Array<{ id: string | number; name: string }>
  hasError?: boolean
  onInput: (v: string) => void
  onSelect: (id: string | number, name: string) => void
  onCreateFromInput: (name: string) => void
}) {
  const [open, setOpen]             = useState(false)
  const [remoteOpts, setRemoteOpts] = useState<Array<{ id: string | number; name: string }>>([])
  const [searching, setSearching]   = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const f = value.toLowerCase()
  const localMatches = companies.filter(c => !f || c.name.toLowerCase().includes(f)).slice(0, 8)
  const displayed    = localMatches.length > 0 ? localMatches : remoteOpts
  const showNew      = value.length > 0 && !companies.some(c => c.name.toLowerCase() === f)

  async function handleInput(v: string) {
    onInput(v)
    setOpen(true)
    setRemoteOpts([])
    const nf = v.toLowerCase()
    const localHits = companies.filter(c => !nf || c.name.toLowerCase().includes(nf))
    if (v.length >= 2 && localHits.length === 0) {
      setSearching(true)
      try {
        const data = await searchCompanies(v)
        setRemoteOpts((data.results || []).slice(0, 8) as Array<{ id: string | number; name: string }>)
      } catch { /* silent */ }
      setSearching(false)
    }
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function pick(id: string | number, name: string) {
    cancelClose()
    setOpen(false)
    onSelect(id, name)
  }

  function create() {
    cancelClose()
    setOpen(false)
    onCreateFromInput(value)
  }

  return (
    <div className="supplier-wrap">
      <input
        type="text"
        className="fc"
        value={value}
        autoComplete="off"
        style={hasError ? { borderColor: 'var(--error)' } : undefined}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { cancelClose(); setOpen(true) }}
        onBlur={scheduleClose}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
      />
      <div className={`supplier-dropdown${open ? ' open' : ''}`}>
        {searching && (
          <div className="supplier-opt" style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
            Searching…
          </div>
        )}
        {!searching && displayed.map(c => (
          <div key={c.id} className="supplier-opt" onMouseDown={() => pick(c.id, String(c.name))}>
            <span className="supplier-opt-name">{c.name}</span>
          </div>
        ))}
        {!searching && showNew && (
          <div className="supplier-opt" onMouseDown={create}>
            <span className="supplier-opt-new">✚ Create &ldquo;{value}&rdquo;</span>
          </div>
        )}
      </div>
    </div>
  )
}
