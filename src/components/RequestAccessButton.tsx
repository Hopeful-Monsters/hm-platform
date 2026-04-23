'use client'

import { useState } from 'react'

type RequestState = 'idle' | 'submitting' | 'success' | 'already_requested' | 'error'

interface Props {
  toolSlug:         string
  toolLabel:        string
  alreadyRequested?: boolean
}

export default function RequestAccessButton({ toolSlug, alreadyRequested = false }: Props) {
  const [state,    setState]    = useState<RequestState>(alreadyRequested ? 'already_requested' : 'idle')
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

  if (state === 'success' || state === 'already_requested') {
    return (
      <span className="request-access-status">
        {state === 'success' ? 'Request sent ✓' : 'Request pending'}
      </span>
    )
  }

  return (
    <div className="request-access-container">
      <button
        onClick={handleRequest}
        disabled={state === 'submitting'}
        className="request-access-btn"
      >
        {state === 'submitting' ? 'Requesting…' : 'Request Access →'}
      </button>

      {state === 'error' && errorMsg && (
        <p className="request-access-error">{errorMsg}</p>
      )}
    </div>
  )
}
