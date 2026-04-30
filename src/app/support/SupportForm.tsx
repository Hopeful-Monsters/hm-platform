'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SUPPORT_TOOL_OPTIONS } from '@/lib/support'
import ScreenshotField from './_components/ScreenshotField'
import SupportSuccess from './_components/SupportSuccess'

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
  { value: 'none',   label: 'No priority' },
]

interface SubmitResult {
  identifier: string
  url:        string
}

function FieldLabel({
  htmlFor, children, optional, className,
}: {
  htmlFor:    string
  children:   React.ReactNode
  optional?:  boolean
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={`hm-label${className ? ` ${className}` : ''}`}>
      {children}
      {optional && <span className="hm-label-optional">(optional)</span>}
    </label>
  )
}

export default function SupportForm({ defaultName }: { defaultName: string }) {
  const [name,       setName]       = useState(defaultName)
  const [tool,       setTool]       = useState('')
  const [tried,      setTried]      = useState('')
  const [happened,   setHappened]   = useState('')
  const [urgency,    setUrgency]    = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [result,     setResult]     = useState<SubmitResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const form = new FormData()
      if (name.trim()) form.append('name', name.trim())
      form.append('tool',     tool)
      form.append('tried',    tried)
      form.append('happened', happened)
      form.append('urgency',  urgency)
      if (screenshot) form.append('screenshot', screenshot)

      const res = await fetch('/api/support', {
        method: 'POST',
        body:   form, // no Content-Type header — browser sets multipart boundary
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setResult(data.issue)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setResult(null); setError(null)
    setName(defaultName)
    setTool(''); setTried(''); setHappened(''); setUrgency('')
    setScreenshot(null)
  }

  if (result) {
    return <SupportSuccess identifier={result.identifier} url={result.url} onReset={handleReset} />
  }

  return (
    <form onSubmit={handleSubmit} className="support-form">
      <div className="support-form-row">
        <div>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter text"
            required
            aria-required="true"
            minLength={1}
            maxLength={100}
            className="hm-input"
          />
        </div>
        <div>
          <FieldLabel htmlFor="tool">Which tool?</FieldLabel>
          <select
            id="tool"
            value={tool}
            onChange={e => setTool(e.target.value)}
            required
            aria-required="true"
            className={`hm-select${!tool ? ' placeholder' : ''}`}
          >
            <option value="" disabled>Select an option</option>
            {SUPPORT_TOOL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="support-form-field">
        <FieldLabel htmlFor="tried">What were you trying to do?</FieldLabel>
        <textarea
          id="tried"
          value={tried}
          onChange={e => setTried(e.target.value)}
          placeholder="Enter text"
          required
          aria-required="true"
          minLength={10}
          maxLength={3000}
          rows={5}
          className="hm-input"
        />
      </div>

      <div className="support-form-field">
        <FieldLabel htmlFor="happened">What happened instead?</FieldLabel>
        <textarea
          id="happened"
          value={happened}
          onChange={e => setHappened(e.target.value)}
          placeholder="Enter text"
          required
          aria-required="true"
          minLength={10}
          maxLength={3000}
          rows={5}
          className="hm-input"
        />
      </div>

      <ScreenshotField
        value={screenshot}
        onChange={setScreenshot}
        onError={setError}
      />

      <div className="support-form-field-lg">
        <FieldLabel htmlFor="urgency">What&apos;s the urgency?</FieldLabel>
        <select
          id="urgency"
          value={urgency}
          onChange={e => setUrgency(e.target.value)}
          required
          aria-required="true"
          className={`hm-select${!urgency ? ' placeholder' : ''}`}
        >
          <option value="" disabled>Select a priority</option>
          {URGENCY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="hm-error-banner" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  )
}
