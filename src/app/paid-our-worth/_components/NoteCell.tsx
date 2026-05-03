'use client'

import { useEffect, useRef, useState } from 'react'
import { upsertNote } from '../_actions'
import type { NoteColumn } from '../_types'

interface Props {
  periodMonth: string
  jobId:       string
  columnKey:   NoteColumn
  initial:     string
  ariaLabel:   string
}

export default function NoteCell({ periodMonth, jobId, columnKey, initial, ariaLabel }: Props) {
  const [value, setValue]   = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(false)
  const lastSaved           = useRef(initial)

  useEffect(() => {
    setValue(initial)
    lastSaved.current = initial
  }, [initial])

  async function commit() {
    if (value === lastSaved.current) return
    setSaving(true)
    setError(false)
    try {
      await upsertNote(periodMonth, jobId, columnKey, value)
      lastSaved.current = value
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <textarea
      className={`pow-input pow-input--ghost pow-note ${error ? 'pow-note--err' : ''}`}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      rows={1}
      aria-label={ariaLabel}
      aria-busy={saving}
      placeholder="—"
    />
  )
}
