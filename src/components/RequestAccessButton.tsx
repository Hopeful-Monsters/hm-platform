'use client'

import { useState } from 'react'

type RequestState = 'idle' | 'submitting' | 'success' | 'already_requested' | 'error'

interface Props {
  toolSlug:  string
  toolLabel: string
  /** If a pending request already exists for this tool, pass true to pre-set the success state */
  alreadyRequested?: boolean
}

export default function RequestAccessButton({ toolSlug, alreadyRequested = false }: Props) {
  const [state, setState] = useState<RequestState>(alreadyRequested ? 'already_requested' : 'idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRequest() {
    setState('submitting')
    setErrorMsg(null)

    try {
      const res  = await fetch('/api/tool-access/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tool_slug: toolSlug }),
      })
      const data = await res.json()

      if (res.status === 409) {
        // Already requested or already has access — treat as success
        setState('already_requested')
        return
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setState('error')
        return
      }

      setState('success')
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  const baseButtonStyle: React.CSSProperties = {
    fontFamily:    'var(--font-heading)',
    fontWeight:    900,
    fontSize:      13,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    border:        'none',
    padding:       '8px 18px',
    cursor:        'pointer',
    transition:    'opacity 0.15s',
  }

  if (state === 'success' || state === 'already_requested') {
    return (
      <span
        style={{
          fontFamily:    'var(--font-heading)',
          fontWeight:    900,
          fontSize:      13,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
        }}
      >
        {state === 'success' ? 'Request sent ✓' : 'Request pending'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <button
        onClick={handleRequest}
        disabled={state === 'submitting'}
        style={{
          ...baseButtonStyle,
          background: 'var(--surface-2)',
          color:      'var(--text)',
          opacity:    state === 'submitting' ? 0.5 : 1,
        }}
      >
        {state === 'submitting' ? 'Requesting…' : 'Request Access →'}
      </button>

      {state === 'error' && errorMsg && (
        <p
          style={{
            fontSize:   13,
            color:      'rgb(239,68,68)',
            fontFamily: 'var(--font-body)',
            margin:     0,
          }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}
