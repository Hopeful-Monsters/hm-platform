'use client'

import type { QueueItem } from '../_types'
import { fmtSize, isOldDate } from '../_utils'

export function QueueRow({ item, onRemove }: { item: QueueItem; onRemove: (id: number) => void }) {
  const d = item.extracted
  const isPdf       = item.mimeType === 'application/pdf'
  const processing  = item.status === 'extracting' || item.status === 'submitting'

  const detail = (
    item.status === 'pending'    ? 'Pending extraction' :
    item.status === 'extracting' ? 'Extracting with AI…' :
    item.status === 'submitting' ? 'Submitting…' :
    item.status === 'error'      ? `Error: ${item.error || 'unknown'}` :
    d.supplier || '—'
  )
  const amountStr = (d.amountExGST !== '' && d.amountExGST != null)
    ? `$${parseFloat(String(d.amountExGST)).toFixed(2)} ex GST` : ''

  const SB_MAP: Record<string, [string, string]> = {
    pending:    ['sb-pending',    'Pending'],
    extracting: ['sb-extracting', 'Extracting…'],
    ready:      ['sb-ready',      'Ready'],
    submitting: ['sb-submitting', 'Submitting…'],
    done:       ['sb-done',       'Done'],
    error:      ['sb-error',      'Error'],
  }
  const [sbClass, sbLabel] = SB_MAP[item.status] ?? ['sb-pending', 'Pending']
  const oldDate  = d.date ? isOldDate(d.date) : false
  const coState  = item.company?.status

  return (
    <div className="qrow">
      <div className="qrow-ico">
        {processing
          ? <span className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />
          : isPdf ? '📄' : '🖼️'}
      </div>
      <div className="qrow-main">
        <div className="qrow-filename">{item.file.name} · {fmtSize(item.file.size)}</div>
        <div className="qrow-detail">{detail}</div>
      </div>
      {amountStr && <div className="qrow-amount">{amountStr}</div>}
      <div className="qrow-badges">
        {oldDate && <span className="sbadge sb-warn">⚠ Date</span>}
        {coState === 'checking' && <span className="sbadge sb-extracting">Checking…</span>}
        {(coState === 'similar' || coState === 'notfound' || coState === 'error') &&
          <span className="sbadge sb-warn">⚠ Company</span>}
        <span className={`sbadge ${sbClass}`}>{sbLabel}</span>
      </div>
      {!processing && item.status !== 'done' && (
        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(item.id)} title="Remove">✕</button>
      )}
    </div>
  )
}
