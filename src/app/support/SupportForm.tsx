'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X } from 'lucide-react'
import { SUPPORT_TOOL_OPTIONS } from '@/lib/support'

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

// ── Shared styles ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-heading)',
  fontWeight: 900,
  fontSize: 14,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '2px solid var(--border)',
  color: 'var(--text)',
  fontSize: 15,
  padding: '10px 14px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 40,
}

// ── Additional style constants ─────────────────────────────────────

const formFieldStyle: React.CSSProperties = { marginBottom: 24 }

const successCardStyle: React.CSSProperties = {
  background:  'var(--surface)',
  border:      '2px solid var(--border)',
  borderLeft:  '4px solid var(--accent)',
  padding:     '40px 36px',
  maxWidth:    720,
}

const successHeadingStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    900,
  fontSize:      36,
  textTransform: 'uppercase',
  lineHeight:    0.95,
  marginBottom:  16,
}

const successBodyStyle: React.CSSProperties = {
  color:        'var(--text-muted)',
  fontSize:     15,
  lineHeight:   1.65,
  marginBottom: 28,
}

const successLinkStyle: React.CSSProperties = {
  color:          'var(--accent)',
  fontFamily:     'var(--font-heading)',
  fontWeight:     900,
  textDecoration: 'none',
}

const errorBannerStyle: React.CSSProperties = {
  background:   'rgba(239,68,68,0.08)',
  border:       '2px solid rgba(239,68,68,0.4)',
  borderLeft:   '4px solid rgb(239,68,68)',
  padding:      '12px 16px',
  marginBottom: 24,
  fontSize:     14,
  color:        'rgb(239,68,68)',
}

const screenshotRowStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        10,
  padding:    '10px 14px',
  background: 'var(--surface)',
  border:     '2px solid var(--border)',
}

const screenshotRemoveBtnStyle: React.CSSProperties = {
  background:  'none',
  border:      'none',
  color:       'var(--text-muted)',
  cursor:      'pointer',
  padding:     2,
  display:     'flex',
  alignItems:  'center',
  flexShrink:  0,
}

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = 'var(--accent)'
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = 'var(--border)'
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} style={labelStyle}>
      {children}
      {optional && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: 0,
            textTransform: 'none',
            color: 'var(--text-muted)',
            marginLeft: 8,
          }}
        >
          (optional)
        </span>
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
    if (file.size > 5 * 1024 * 1024) {
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
      <div style={successCardStyle}>
        <p className="eyebrow" style={{ marginBottom: 12, color: 'var(--accent-label)' }}>
          Submitted
        </p>
        <h2 style={successHeadingStyle}>
          We&apos;ve got it.
        </h2>
        <p style={successBodyStyle}>
          Logged as{' '}
          <a href={result.url} target="_blank" rel="noopener noreferrer" style={successLinkStyle}>
            {result.identifier}
          </a>{' '}
          in Linear and added to Triage for review.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
      {/* Name + Tool — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter text"
            required
            minLength={1}
            maxLength={100}
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>
        <div>
          <FieldLabel htmlFor="tool">Which tool?</FieldLabel>
          <select
            id="tool"
            value={tool}
            onChange={e => setTool(e.target.value)}
            required
            style={{
              ...selectStyle,
              color: tool ? 'var(--text)' : 'var(--text-muted)',
            }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="" disabled>Select an option</option>
            {SUPPORT_TOOL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* What were you trying to do */}
      <div style={formFieldStyle}>
        <FieldLabel htmlFor="tried">What were you trying to do?</FieldLabel>
        <textarea
          id="tried"
          value={tried}
          onChange={e => setTried(e.target.value)}
          placeholder="Enter text"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* What happened instead */}
      <div style={formFieldStyle}>
        <FieldLabel htmlFor="happened">What happened instead?</FieldLabel>
        <textarea
          id="happened"
          value={happened}
          onChange={e => setHappened(e.target.value)}
          placeholder="Enter text"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Screenshot — single line */}
      <div style={{ ...formFieldStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label
          htmlFor="screenshot"
          style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Screenshot
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              fontSize: 12,
              letterSpacing: 0,
              textTransform: 'none',
              color: 'var(--text-muted)',
              marginLeft: 8,
            }}
          >
            (optional)
          </span>
        </label>

        {screenshot ? (
          <div style={{ ...screenshotRowStyle, flex: 1 }}>
            <Paperclip size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {screenshot.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
              {(screenshot.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={removeScreenshot}
              style={screenshotRemoveBtnStyle}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--text)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Paperclip size={14} />
              Add file
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
          style={{ display: 'none' }}
        />
      </div>

      {/* Urgency */}
      <div style={{ marginBottom: 32 }}>
        <FieldLabel htmlFor="urgency">What&apos;s the urgency?</FieldLabel>
        <select
          id="urgency"
          value={urgency}
          onChange={e => setUrgency(e.target.value)}
          required
          style={{
            ...selectStyle,
            color: urgency ? 'var(--text)' : 'var(--text-muted)',
          }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        >
          <option value="" disabled>Select a priority</option>
          {URGENCY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={errorBannerStyle}>
          {error}
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  )
}
