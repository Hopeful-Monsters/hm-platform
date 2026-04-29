'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X } from 'lucide-react'
import { SUPPORT_TOOL_OPTIONS } from '@/lib/support'
import { MAX_UPLOAD_BYTES } from '@/lib/constants/file-limits'

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
  { value: 'none',   label: 'No priority' },
]

interface SubmitResult {
  identifier: string
  url: string
}

function FieldLabel({
  htmlFor,
  children,
  optional,
  className,
}: {
  htmlFor: string
  children: React.ReactNode
  optional?: boolean
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={`hm-label${className ? ` ${className}` : ''}`}>
      {children}
      {optional && (
        <span className="hm-label-optional">(optional)</span>
      )}
    </label>
  )
}

export default function SupportForm({
  defaultName,
}: {
  defaultName: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName]           = useState(defaultName)
  const [tool, setTool]           = useState('')
  const [tried, setTried]         = useState('')
  const [happened, setHappened]   = useState('')
  const [urgency, setUrgency]     = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<SubmitResult | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Screenshot must be under 5 MB.')
      return
    }
    setError(null)
    setScreenshot(file)
  }

  function removeScreenshot() {
    setScreenshot(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const form = new FormData()
      if (name.trim()) form.append('name', name.trim())
      form.append('tool', tool)
      form.append('tried', tried)
      form.append('happened', happened)
      form.append('urgency', urgency)
      if (screenshot) form.append('screenshot', screenshot)

      const res = await fetch('/api/support', {
        method: 'POST',
        body: form, // no Content-Type header — browser sets multipart boundary
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
    setResult(null)
    setError(null)
    setName(defaultName)
    setTool('')
    setTried('')
    setHappened('')
    setUrgency('')
    setScreenshot(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Success ──────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="support-success-card">
        <p className="eyebrow hm-accent mb-3">Submitted</p>
        <h2 className="display-md hm-text mb-3">
          We&apos;ve got it.
        </h2>
        <p className="subhead mb-8">
          Logged as{' '}
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="hm-link">
            {result.identifier}
          </a>{' '}
          in Linear and added to Triage for review.
        </p>
        <div className="support-success-buttons">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Submit another
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              View in Linear →
            </a>
          </Button>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="support-form">
      {/* Name + Tool — two columns */}
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

      {/* What were you trying to do */}
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

      {/* What happened instead */}
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

      {/* Screenshot — single line */}
      <div className="support-screenshot-row">
        <FieldLabel htmlFor="screenshot" optional className="support-screenshot-label">
          Screenshot
        </FieldLabel>

        {screenshot ? (
          <div className="support-file-pill">
            <Paperclip size={14} className="support-file-icon" />
            <span className="support-file-name">
              {screenshot.name}
            </span>
            <span className="support-file-size">
              {(screenshot.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={removeScreenshot}
              className="support-file-remove"
              aria-label="Remove screenshot"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="support-attach-btn"
            >
              <Paperclip size={14} />
              Add file
            </button>
            <span className="support-attach-hint">
              PNG, JPG, WebP or GIF · max 5 MB
            </span>
          </>
        )}

        <input
          ref={fileInputRef}
          id="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>

      {/* Urgency */}
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

      {/* Error */}
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
